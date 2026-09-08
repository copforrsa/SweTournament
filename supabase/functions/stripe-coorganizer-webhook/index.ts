import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

Deno.serve(async(req)=>{
  if(req.method!=='POST')return new Response('Method Not Allowed',{status:405,headers:{'Allow':'POST','Cache-Control':'no-store'}});
  const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2024-12-18.acacia'});
  const raw=await req.text();const sig=req.headers.get('stripe-signature');if(!sig)return new Response('Bad Request',{status:400});
  let event:Stripe.Event;
  try{event=await stripe.webhooks.constructEventAsync(raw,sig,Deno.env.get('STRIPE_WEBHOOK_SECRET')!);}
  catch(e){console.error('Invalid Stripe signature',e);return new Response('Bad Request',{status:400});}

  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:ledgerErr}=await admin.from('stripe_webhook_events').insert({stripe_event_id:event.id,event_type:event.type,processing_status:'processing'});
  if(ledgerErr){if((ledgerErr as any).code==='23505')return new Response('ok',{status:200});console.error('Webhook ledger error',ledgerErr);return new Response('Server Error',{status:500});}

  try{
    let handled=false;
    if(event.type==='checkout.session.completed'){
      const s=event.data.object as Stripe.Checkout.Session;
      if((s.metadata?.type==='swe_coorganizers'||s.metadata?.type==='swe_coorganizer_invitee')&&s.payment_status==='paid'){
        const subscriptionId=typeof s.subscription==='string'?s.subscription:s.subscription?.id;
        if(subscriptionId){
          const sub=await stripe.subscriptions.retrieve(subscriptionId);
          const status=sub.status==='canceled'?'canceled':sub.status;
          const workspaceId=s.metadata.workspace_id;
          const quantity=Number(s.metadata.quantity||1);
          const unit=Number(s.metadata.unit_amount_cents||0);
          const {error}=await admin.rpc('sync_coorganizer_subscription_from_stripe',{p_workspace_id:workspaceId,p_stripe_subscription_id:subscriptionId,p_stripe_checkout_session_id:s.id,p_quantity:quantity,p_unit_amount_cents:unit,p_stripe_status:status,p_request_id:s.metadata.request_id||event.id});
          if(error)throw error;
          if(s.metadata.type==='swe_coorganizer_invitee'){
            const inviteId=s.metadata.invite_id;
            const payerUserId=s.metadata.payer_user_id;
            const period=s.metadata.billing_period==='year'?'year':'month';
            const {error:mapErr}=await admin.from('workspace_coorganizer_subscriptions').update({payer_user_id:payerUserId,invite_id:inviteId,billing_period:period,payment_source:'invitee'}).eq('stripe_subscription_id',subscriptionId);
            if(mapErr)throw mapErr;
            const {error:actErr}=await admin.rpc('activate_paid_coorganizer_invite',{p_invite_id:inviteId,p_user_id:payerUserId,p_stripe_subscription_id:subscriptionId,p_billing_period:period});
            if(actErr)throw actErr;
          }else{
            await admin.from('workspace_coorganizer_subscriptions').update({billing_period:s.metadata.billing_period||null,payment_source:'workspace_admin'}).eq('stripe_subscription_id',subscriptionId);
          }
          handled=true;
        }
      }
    }

    if(event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){
      const sub=event.data.object as Stripe.Subscription;
      if(sub.metadata?.type==='swe_coorganizers'||sub.metadata?.type==='swe_coorganizer_invitee'){
        const status=event.type==='customer.subscription.deleted'?'canceled':(sub.status==='canceled'?'canceled':sub.status);
        const {error}=await admin.rpc('sync_coorganizer_subscription_from_stripe',{p_workspace_id:sub.metadata.workspace_id,p_stripe_subscription_id:sub.id,p_stripe_checkout_session_id:null,p_quantity:Number(sub.metadata.quantity||1),p_unit_amount_cents:Number(sub.metadata.unit_amount_cents||0),p_stripe_status:status,p_request_id:sub.metadata.request_id||event.id});
        if(error)throw error;
        if(sub.metadata.type==='swe_coorganizer_invitee'){
          const period=sub.metadata.billing_period==='year'?'year':'month';
          await admin.from('workspace_coorganizer_subscriptions').update({payer_user_id:sub.metadata.payer_user_id||null,invite_id:sub.metadata.invite_id||null,billing_period:period,payment_source:'invitee'}).eq('stripe_subscription_id',sub.id);
          if(status==='canceled'){
            const {error:deactErr}=await admin.rpc('deactivate_self_paid_coorganizer_subscription',{p_stripe_subscription_id:sub.id});
            if(deactErr)throw deactErr;
          }
        }
        handled=true;
      }
    }

    await admin.from('stripe_webhook_events').update({processed_at:new Date().toISOString(),processing_status:handled?'processed':'ignored',last_error:null}).eq('stripe_event_id',event.id);
    return new Response('ok',{status:200,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch(e){
    console.error('Webhook processing failed',event.id,e);
    await admin.from('stripe_webhook_events').update({processed_at:new Date().toISOString(),processing_status:'failed',last_error:String(e).slice(0,500)}).eq('stripe_event_id',event.id);
    return new Response('Server Error',{status:500});
  }
});
