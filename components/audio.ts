export function playSound(url:string,volume=0.6){try{const a=new Audio(url);a.volume=Math.max(0,Math.min(1,volume));void a.play()}catch{}}
