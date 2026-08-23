"use client";
import { createClient } from "@/src/lib/supabase/client";
export function LogoutButton(){
  return <button className="btn" onClick={async()=>{try{await createClient().auth.signOut();}finally{window.location.assign("/login");}}}>Sign out</button>;
}
