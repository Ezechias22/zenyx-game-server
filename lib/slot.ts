import { DEFAULT_PAYLINES } from './games'
export type Matrix=string[][]
export function normalizeMatrix(input?:Matrix):Matrix|null{
  if(!input||!Array.isArray(input)||input.length===0) return null
  const rows=input.length; const cols=Array.isArray(input[0])?input[0].length:0
  if(!cols) return null
  for(const r of input) if(!Array.isArray(r)||r.length!==cols) return null
  return input
}
export function toRowMajor(m:Matrix):Matrix{
  const r=m.length, c=m[0]?.length||0
  if(r===3&&c===5) return m
  if(r===5&&c===3){
    const out:string[][]=Array.from({length:3},()=>Array(5).fill(''))
    for(let i=0;i<5;i++) for(let j=0;j<3;j++) out[j][i]=m[i][j]
    return out
  }
  return m
}
export type WinLine={lineIndex:number;positions:[number,number][];amount?:number}
export function deriveWinningLines(matrix:Matrix, winAmount?:number):WinLine[]{
  if(matrix.length<3||(matrix[0]?.length||0)<5) return []
  const wins:WinLine[]=[]
  DEFAULT_PAYLINES.forEach((line,idx)=>{
    const coords=line.map((row,col)=>[row,col] as [number,number])
    const sym0=matrix[coords[0][0]][coords[0][1]]
    if(!sym0) return
    let streak=1
    for(let i=1;i<coords.length;i++){
      const [r,c]=coords[i]
      if(matrix[r][c]===sym0) streak++
      else break
    }
    if(streak>=3) wins.push({lineIndex:idx,positions:coords.slice(0,streak),amount:winAmount&&winAmount>0?winAmount:undefined})
  })
  return wins
}
