// Legacy entry point: phones with the old service worker may still load the old cached page, which imports this file.
// Send them once to the new static pages (the session flag prevents a redirect loop).
try{
  if(!sessionStorage.getItem('jadwaly-legacy-redirect')){
    sessionStorage.setItem('jadwaly-legacy-redirect','1');
    const group=new URLSearchParams(location.search).get('group');
    location.replace(/^(?:[1-9]|1[0-2])$/.test(group||'')?`/group/${group}/${location.hash==='#week'?'#week':''}`:'/');
  }
}catch(e){}
