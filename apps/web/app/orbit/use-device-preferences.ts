"use client";
import {useEffect,useState} from "react";
import {defaultPreferences,PREFERENCES_KEY,sanitizePreferences,type DevicePreferences} from "./device-preferences";
export function useDevicePreferences() {
  const [preferences,setPreferences]=useState(defaultPreferences);
  useEffect(()=>{
    const sync=()=>{try{setPreferences(sanitizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY)??"null")));}catch{setPreferences(defaultPreferences);}};
    const storage=(event:StorageEvent)=>{if(event.key===PREFERENCES_KEY||event.key===null)sync();};
    sync();window.addEventListener("orbit-preferences",sync);window.addEventListener("storage",storage);
    return()=>{window.removeEventListener("orbit-preferences",sync);window.removeEventListener("storage",storage);};
  },[]);
  function save(next:DevicePreferences) {
    const clean=sanitizePreferences(next);
    try{localStorage.setItem(PREFERENCES_KEY,JSON.stringify(clean));}catch{throw new Error("Browser storage is unavailable. Allow local storage to save these preferences.");}
    setPreferences(clean);window.dispatchEvent(new Event("orbit-preferences"));
  }
  return {preferences,save};
}
