function setTransformerAdd(v1: number[], v2: number[])
{
    const s1: Set<number> = new Set(v1);
    const s2: Set<number> = new Set(v2);

    const s3 = new Set<number>([...s1, ...s2]);
    const v3: number[] = [...s3];
    return v3;
}

function equalsSets<T>(A: Set<T>, B: Set<T>): boolean {
    if(A.size !== B.size) return false;

    for(const element of A) {
        if(!B.has(element)) {
            return false;
        }
    }

    return true;
}

function complemento<T>(
  A: Set<T>,
  B: Set<T>
): Set<T> {

  return new Set(
    [...B].filter(x => !A.has(x))
  );
}
/**
 * 
 * @param p Representa a instância original, não necessariamente a atual, dos elementos de Pc.
 * @param I Representa os elementos a serem removidos, levando em consideração a exclusividade com os elementos em Vi.
 * @param vi Representa o conjunto de todos os conjuntos, para gerenciar a exclusividade dos elementos em I a serem removidos em P.
 * @returns 
 */
function setTransformerRemove(p: number[], I: number[], vi: number[][])
{
    let sp: Set<number> = new Set(p);
    let si: Set<number> = new Set(I);
    
    const originalSi: Set<number> = si; // Armazena os valores originais do conjunto Si.
    
    for(let i = 0; i < vi.length; i++)
    {
        const sc: Set<number> = new Set(vi[i])
        if (equalsSets(originalSi, sc)) continue;
        si = complemento(sc, si)
    }
    
    sp = complemento(si, sp) 
    
    const r: number[] = [...sp];
    return r;

}

let p = [2,3,4]
let f = p // Valores originais de P

let v2 = [1,3,4]
let v3 = [3,5,6]
let v4 = [6,4,7]

p = setTransformerAdd(p,v2)  // {1,2,3,4}
p = setTransformerAdd(p,v3)  // {1,2,3,4,5,6}
p = setTransformerAdd(p, v4) // {1,2,3,4,5,6,7}
const vs = [f, v2,v3, v4]

p = setTransformerRemove(p, v3,vs) // {1,2,3,4,6,7}
console.log(p) // Apenas o 5 foi removido, pois em relação aos conjuntos em vs, apenas o 5 era o elemento exclusivo.
console.log("Test Log");
console.info("Teste do agente")
