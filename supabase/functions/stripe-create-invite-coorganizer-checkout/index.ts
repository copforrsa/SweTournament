import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';
import { allowedOrigin, bearer, jsonHeaders, requestId, requirePost, safeErrorMessage } from '../_shared/security.ts';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async(req)=>{
  let origin=''; const rid=requestId(req);
  try{
    origin=allowedOrigin(req);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:jsonHeaders(origin)});
    requirePost(req);
    const token=bearer(req);
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await admin.auth.getUser(token);
    if(userError||!user)throw new Error('AUTH_REQUIRED');

    const body=await req.json();
    const inviteId=String(body.invite_id||'');
    const period=body.billing_period==='year'?'year':'month';
    const clientRequestId=String(body.request_id||'');
    if(!uuid.test(inviteId)||!uuid.test(clientRequestId))throw new Error('INVALID_REQUEST');

    const {data:inv,error:invErr}=await admin.from('workspace_invites').select('id,workspace_id,email,role,accepted_at,payment_responsibility,payment_status').eq('id',inviteId).maybeSingle();
    if(invErr||!inv||inv.role!=='coorganizer'||inv.accepted_at||inv.payment_responsibility!=='invitee')throw new Error('INVALID_INVITE');
    if(String(inv.email||'').toLowerCase()!==String(user.email||'').toLowerCase())throw new Error('ACCESS_DENIED');
    if(inv.payment_status==='paid')throw new Error('ALREADY_PAID');

    const bucket=`coorg-invite-checkout:${user.id}:${inviteId}`;
    const {data:ok,error:rlErr}=await admin.rpc('consume_security_rate_limit',{p_bucket_key:bucket,p_limit:8,p_window_seconds:600});
    if(rlErr||ok!==true)throw new Error('RATE_LIMIT');

    const appUrl=(Deno.env.get('SWE_APP_URL')||'').trim().replace(/\/$/,'');
    if(!/^https:\/\//.test(appUrl))throw new Error('SECURITY_CONFIG_MISSING');
    const unit=period==='year'?1990:199;
    const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2024-12-18.acacia'});
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',customer_email:user.email||undefined,client_reference_id:inviteId,
      line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:unit,recurring:{interval:period==='year'?'year':'month'},product_data:{name:'SWÉ TOURNAMENT — Accès co-gestionnaire',description:period==='year'?'1 accès co-gestionnaire • abonnement annuel':'1 accès co-gestionnaire • abonnement mensuel'}}}],
      success_url:`${appUrl}/?coorg_invite=success&invite=${inviteId}`,
      cancel_url:`${appUrl}/?coorg_invite=cancel&invite=${inviteId}`,
      allow_promotion_codes:false,
      metadata:{type:'swe_coorganizer_invitee',invite_id:inviteId,workspace_id:inv.workspace_id,payer_user_id:user.id,billing_period:period,quantity:'1',unit_amount_cents:String(unit),request_id:clientRequestId},
      subscription_data:{metadata:{type:'swe_coorganizer_invitee',invite_id:inviteId,workspace_id:inv.workspace_id,payer_user_id:user.id,billing_period:period,quantity:'1',unit_amount_cents:String(unit),request_id:clientRequestId}}
    },{idempotencyKey:`swe-coorg-invite-${inviteId}-${clientRequestId}`});

    await admin.from('workspace_invites').update({preferred_billing_period:period,payment_started_at:new Date().toISOString()}).eq('id',inviteId);
    await admin.from('security_audit_log').insert({workspace_id:inv.workspace_id,actor_user_id:user.id,actor_type:'user',action:'billing.coorganizer_invitee_checkout_created',target_type:'workspace_invite',target_id:inviteId,request_id:rid,metadata:{billing_period:period,unit_amount_cents:unit}});
    return Response.json({url:session.url,request_id:rid},{headers:jsonHeaders(origin)});
  }catch(e){
    console.error('[stripe-create-invite-coorganizer-checkout]',rid,e);
    const headers=origin?jsonHeaders(origin):{'Content-Type':'application/json','Cache-Control':'no-store'};
    const code=e instanceof Error?e.message:String(e);
    const friendly:Record<string,string>={INVALID_INVITE:'Invitation invalide ou déjà utilisée',ALREADY_PAID:'Cet accès est déjà payé'};
    const status=code==='ORIGIN_NOT_ALLOWED'?403:400;
    return Response.json({error:friendly[code]||safeErrorMessage(e),request_id:rid},{status,headers});
  }
});
