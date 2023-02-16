export function delay(ms: number){
    return new Promise(resolve=>setTimeout(resolve, ms))
}

export function ctime(){
    return new Date().getTime()
}