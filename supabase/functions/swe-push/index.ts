import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response(null,{headers:cors});
 const publicKey=Deno.env.get("SWE_VAPID_PUBLIC_KEY")||"";
 if(request.method==="GET")return reply({enabled:!!(publicKey&&Deno.env.get('SWE_VAPID_PRIVATE_KEY')&&Deno.env.get('SWE_VAPID_CONTACT')),publicKey:publicKey||null});
 if(request.method!=="POST")return reply({error:"Method not allowed"},405);
 const header=request.headers.get("authorization")||"";
 const provided=header.startsWith("Bearer ")?header.slice(7).trim():"";
 if(!provided)return reply({error:"missing_bearer_authorization"},401);
 const privateKey=Deno.env.get("SWE_VAPID_PRIVATE_KEY")||"";
 const contact=Deno.env.get("SWE_VAPID_CONTACT")||"";
 if(!publicKey||!privateKey||!contact)return reply({error:"VAPID not configured"},503);
 const url=Deno.env.get("SUPABASE_URL")||"";
 // Authenticate against the database itself rather than comparing two environment copies of the key.
 // This table is explicitly inaccessible to anon/authenticated roles.
 const db=createClient(url,provided,{auth:{persistSession:false}});
 const {error:authError}=await db.from("swe_push_subscriptions").select("id").limit(1);
 if(authError)return reply({error:"service_role_not_authorized_by_database"},401);
 webpush.setVapidDetails(contact,publicKey,privateKey);
 const {error:scheduleError}=await db.rpc("swe_schedule_tournament_start_notifications_v1");
 if(scheduleError)return reply({error:"tournament_schedule_failed",detail:scheduleError.message},500);
 // Never replay hours-old notifications when the dispatcher runs late or a device joins.
 // The in-app history remains available even after this push delivery window expires.
 const cutoff=new Date(Date.now()-15*60*1000).toISOString();
 const {data:events,error}=await db.from("swe_organizer_notifications_v54").select("id,recipient_user_id,title,body,created_at").gte("created_at",cutoff).order("id",{ascending:false}).limit(500);
 if(error)return reply({error:error.message},500);
 let sent=0,expired=0,failed=0,maxId=0;
 // Fetch subscriptions once instead of issuing a database query for every event.
 const {data:subscriptions,error:subscriptionsError}=await db.from("swe_push_subscriptions").select("user_id,endpoint,p256dh,auth_key").limit(1000);
 if(subscriptionsError)return reply({error:subscriptionsError.message},500);
 const subscriptionsByUser=new Map();
 for(const sub of subscriptions||[]){
  const key=String(sub.user_id),list=subscriptionsByUser.get(key)||[];
  list.push(sub);subscriptionsByUser.set(key,list);
 }
 const eventIds=(events||[]).map(e=>e.id);
 const delivered=new Set();
 // PostgREST caps response rows; avoid missing old delivery marks in large bursts.
 for(let offset=0;offset<eventIds.length;offset+=100){
  const group=eventIds.slice(offset,offset+100);
  const {data:rows,error:deliveryError}=await db.from("swe_push_deliveries").select("notification_id,endpoint").in("notification_id",group).limit(1000);
  if(deliveryError)return reply({error:deliveryError.message},500);
  for(const row of rows||[])delivered.add(row.notification_id+'|'+row.endpoint);
 }
 for(const event of events||[]){
  maxId=Math.max(maxId,event.id);
  for(const sub of subscriptionsByUser.get(String(event.recipient_user_id))||[]){
   const key=event.id+'|'+sub.endpoint;
   if(delivered.has(key))continue;
   // Claim the (event, device) pair before the network call. Concurrent scheduled
   // dispatchers cannot send the same message twice (unique database constraint).
   const {error:claimError}=await db.from("swe_push_deliveries").insert({notification_id:event.id,endpoint:sub.endpoint});
   if(claimError){
    if(claimError.code==='23505'){delivered.add(key);continue;}
    failed++;continue;
   }
   try{
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
      JSON.stringify({title:event.title,body:event.body,url:"/?start=home",id:event.id}),{TTL:300});
    sent++;
    delivered.add(key);
   }catch(err){
    // Release our claim on failure so a later dispatcher can retry while fresh.
    await db.from("swe_push_deliveries").delete().eq("notification_id",event.id).eq("endpoint",sub.endpoint);
    if(err.statusCode===404||err.statusCode===410){
     await db.from("swe_push_subscriptions").delete().eq("endpoint",sub.endpoint);
     expired++;
    }else failed++;
   }
  }
 }
 return reply({max_id:maxId,sent,expired,failed,processed:(events||[]).length});
});