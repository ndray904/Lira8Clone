// Coalesce pointer events; never delay note on/off, switches, or preset resets.
export function createControlSender(deliver, schedule=requestAnimationFrame) {
  const pending=new Map();let scheduled=false;
  function flush(){scheduled=false;for(const [name,value] of pending)deliver(name,value);pending.clear();}
  return function send(name,value,defer=false){
    if(!defer){pending.delete(name);deliver(name,value);return;}
    pending.set(name,value);
    if(!scheduled){scheduled=true;schedule(flush);}
  };
}
