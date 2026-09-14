import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';
import { allowedOrigin, bearer, jsonHeaders, requestId, requirePost, safeErrorMessage } from '../_shared/security.ts';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eligible=new Set(['active','trialing']);

Deno.serve(async(req)=>{
  let origin='';const rid=requestId(req);
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
    if(!uuid.test(inviteId))throw new Error('INVALID_REQUEST');

    const {data:inv,error:invErr}=await admin.from('workspace_invites')
      .select('id,workspace_id,email,role,accepted_at,payment_responsibility,payment_status,stripe_subscription_id')
      .eq('id',inviteId).maybeSingle();
    if(invErr||!inv||inv.role!=='coorganizer'||inv.payment_responsibility!=='invitee')throw new Error('INVALID_INVITE');
    if(String(inv.email||'').toLowerCase()!==String(user.email||'').toLowerCase())throw new Error('ACCESS_DENIED');
    if(inv.payment_status==='paid'&&inv.accepted_at)return Response.json({activated:true,workspace_id:inv.workspace_id,request_id:rid},{headers:jsonHeaders(origin)});

    const bucket=`coorg-invite-reconcile:${user.id}:${inviteId}`;
    const {data:ok,error:rlErr}=await admin.rpc('consume_security_rate_limit',{p_bucket_key:bucket,p_limit:8,p_window_seconds:600});
    if(rlErr||ok!==true)throw new Error('RATE_LIMIT');

    const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2024-12-18.acacia'});
    const found=await stripe.subscriptions.search({query:`metadata['invite_id']:'${inviteId}'`,limit:10});
    const sub=found.data
      .filter(s=>s.metadata?.type==='swe_coorganizer_invitee'&&s.metadata?.payer_user_id===user.id&&s.metadata?.workspace_id===inv.workspace_id&&eligible.has(s.status))
      .sort((a,b)=>b.created-a.created)[0];
    if(!sub)return Response.json({activated:false,status:'pending',request_id:rid},{headers:jsonHeaders(origin)});

    const sessions=await stripe.checkout.sessions.list({subscription:sub.id,limit:10});
    const session=sessions.data.find(s=>s.status==='complete'&&s.payment_status==='paid'&&s.metadata?.invite_id===inviteId);
    if(!session)return Response.json({activated:false,status:'pending',request_id:rid},{headers:jsonHeaders(origin)});

    const period=sub.metadata.billing_period==='year'?'year':'month';
    const unit=Number(sub.metadata.unit_amount_cents||0);
    const quantity=Number(sub.metadata.quantity||1);
    const {error:syncErr}=await admin.rpc('sync_coorganizer_subscription_from_stripe',{
      p_workspace_id:inv.workspace_id,p_stripe_subscription_id:sub.id,p_stripe_checkout_session_id:session.id,
      p_quantity:quantity,p_unit_amount_cents:unit,p_stripe_status:sub.status,p_request_id:sub.metadata.request_id||rid
    });
    if(syncErr)throw syncErr;
    const {error:mapErr}=await admin.from('workspace_coorganizer_subscriptions').update({
      payer_user_id:user.id,invite_id:inviteId,billing_period:period,payment_source:'invitee'
    }).eq('stripe_subscription_id',sub.id);
    if(mapErr)throw mapErr;
    const {data:workspaceId,error:activateErr}=await admin.rpc('activate_paid_coorganizer_invite',{
      p_invite_id:inviteId,p_user_id:user.id,p_stripe_subscription_id:sub.id,p_billing_period:period
    });
    if(activateErr)throw activateErr;
    await admin.from('security_audit_log').insert({
      workspace_id:inv.workspace_id,actor_user_id:user.id,actor_type:'user',
      action:'billing.coorganizer_invitee_reconciled',target_type:'workspace_invite',target_id:inviteId,
      request_id:rid,metadata:{stripe_subscription_id:sub.id,stripe_checkout_session_id:session.id}
    });
    return Response.json({activated:true,workspace_id:workspaceId||inv.workspace_id,request_id:rid},{headers:jsonHeaders(origin)});
  }catch(e){
    console.error('[stripe-reconcile-invite-coorganizer]',rid,e);
    const code=e instanceof Error?e.message:String(e);
    const status=code==='AUTH_REQUIRED'?401:['ORIGIN_NOT_ALLOWED','ACCESS_DENIED'].includes(code)?403:400;
    const headers=origin?jsonHeaders(origin):{'Content-Type':'application/json','Cache-Control':'no-store'};
    return Response.json({error:safeErrorMessage(e),request_id:rid},{status,headers});
  }
});
