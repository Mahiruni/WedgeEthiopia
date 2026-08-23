"use client";

export function LogoutButton(){
  return <button className="btn" onClick={()=>window.location.assign("/login")}>Exit demo</button>;
}
