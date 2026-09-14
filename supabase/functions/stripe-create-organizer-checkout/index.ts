import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const allowed=new Set(['https://swetournament.fr','https://www.swetournament.fr','https://app.swetournament.fr']);
const supportedPlans=new Set(['standard','pro']);
function headers(origin:string){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-request-id','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}}
function fail(msg:string,status=400,origin='https://swetournament.fr'){return Response.json({error:msg},{status,headers:headers(origin)})}

Deno.serve(async(req)=>{
  const origin=(req.headers.get('origin')||'').replace(/\/$/,'');
  if(req.method==='OPTIONS') return allowed.has(origin)?new Response(null,{status:204,headers:headers(origin)}):new Response(null,{status:403});
  if(req.method!=='POST'||!allowed.has(origin)) return fail('Requête non autorisée',403,allowed.has(origin)?origin:'https://swetournament.fr');
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.replace(/^Bearer\s+/i,'').trim();
    if(!token) return fail('Authentification requise',401,origin);

    const body=await req.json().catch(()=>({}));
    const plan=String(body.plan||'').toLowerCase() ;
    const billing=String(body.billing_period||'monthly').toLowerCase()==='annual'?'annual':'monthly';
    const trialDays=Number(body.trial_days||0)===60?60:0;
    const workspaceName=String(body.workspace_name||'').trim();
    const organizerType=String(body.organizer_type||'group').toLowerCase()==='pro'?'pro':'group';
    if(!supportedPlans.has(plan)) return fail('Formule invalide',400,origin);
    if(!workspaceName) return fail('Nom de l’espace obligatoire',400,origin);
    if(workspaceName.length>120) return fail('Nom de l’espace trop long',400,origin);

    const supabaseUrl=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin=createClient(supabaseUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:userErr}=await admin.auth.getUser(token);
    const user=userData?.user;
    if(userErr||!user) return fail('Session expirée, reconnecte-toi.',401,origin);

    const {data:cfg,error:catalogError}=await admin.from('platform_subscription_plans').select('*').eq('code',plan).eq('active',true).single();
    if(catalogError||!cfg||cfg.is_free) return fail('Cette formule est indisponible.',400,origin);
    const amount=billing==='annual'?cfg.annual_price_cents:cfg.monthly_price_cents;
    if(!Number.isInteger(amount)||amount<=0) return fail('Tarif indisponible.',400,origin);
    if(body.expected_amount_cents!==undefined&&Number(body.expected_amount_cents)!==amount) return fail('Le tarif a changé. Actualise les formules avant de continuer.',409,origin);
    const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
    const {data:rateOk}=await admin.rpc('consume_security_rate_limit',{p_bucket_key:`organizer-checkout:${user.id}:${ip}`,p_limit:6,p_window_seconds:900});
    if(rateOk!==true) return fail('Trop de tentatives. Réessayez plus tard.',429,origin);

    const {data:intent,error:intentErr}=await admin.from('organizer_checkout_intents').insert({
      user_id:user.id,
      workspace_name:workspaceName,
      organizer_type:organizerType,
      plan_code:plan,
      plan_snapshot:cfg,
      billing_period:billing,
      trial_days:trialDays,
      amount_cents:amount,
      status:'pending',
      contact_email:user.email||null
    }).select('id').single();
    if(intentErr||!intent) throw intentErr||new Error('INTENT_CREATE_FAILED');

    const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2024-12-18.acacia'});
    const meta={type:'swe_organizer_subscription',intent_id:intent.id,plan_code:plan,billing_period:billing,user_id:user.id};
    const subscriptionData:any={metadata:meta};
    if(trialDays===60){subscriptionData.trial_period_days=60;subscriptionData.trial_settings={end_behavior:{missing_payment_method:'cancel'}};}
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      customer_email:user.email||undefined,
      line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:amount,recurring:{interval:billing==='annual'?'year':'month'},product_data:{name:`SWÉ Tournament — ${cfg.name}`,description:trialDays===60?'60 jours offerts puis renouvellement automatique':'Abonnement '+(billing==='annual'?'annuel':'mensuel')+' SWÉ Tournament'}}}],
      ...(trialDays===60?{payment_method_collection:'always'}:{}),
      success_url:`https://app.swetournament.fr/?start=player&organizer_checkout=success&intent=${intent.id}&checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`https://app.swetournament.fr/?start=player&organizer_setup=1&organizer_checkout=cancelled&intent=${intent.id}`,
      allow_promotion_codes:false,
      billing_address_collection:'auto',
      metadata:{...meta,trial_days:String(trialDays)},
      subscription_data:subscriptionData
    });
    await admin.from('organizer_checkout_intents').update({stripe_checkout_session_id:session.id,updated_at:new Date().toISOString()}).eq('id',intent.id).eq('user_id',user.id);
    return Response.json({url:session.url,intent_id:intent.id},{headers:headers(origin)});
  }catch(e){console.error('[organizer-checkout]',e);return fail('Paiement momentanément indisponible',500,origin)}
});
