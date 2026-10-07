import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
import {command} from './server.mjs';
const headers={'Access-Control-Allow-Origin':'https://app.swetournament.fr','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'Méthode refusée'}),{status:405,headers});
 try{
  const authorization=req.headers.get('authorization');
  if(!authorization)throw new Error('Connexion requise');
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:auth,error:authError}=await userClient.auth.getUser();if(authError||!auth.user)throw new Error('Session invalide');
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const repository={
   context:async(id:string)=>{const {data,error}=await userClient.rpc('fast_conquest_context',{p_tournament_id:id});if(error)throw error;return data;},
   commit:async(id:string,user:string,version:number,state:unknown,meta:{action:string,matchId?:string})=>{const {data,error}=await service.rpc('fast_conquest_commit',{p_tournament_id:id,p_actor:user,p_version:version,p_state:state,p_action:meta.action,p_match_id:meta.matchId||null});if(error)throw error;return data;}
  };
  const input=await req.json();
  const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
  const data=await command(repository,auth.user.id,input,random);
  return new Response(JSON.stringify(data),{headers});
 }catch(e){const message=e instanceof Error?e.message:String((e as {message?:string})?.message||'Action impossible');return new Response(JSON.stringify({error:message}),{status:message.includes('VERSION_CONFLICT')?409:400,headers});}
});
