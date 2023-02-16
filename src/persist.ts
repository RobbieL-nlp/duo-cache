import type { CacheOption, FetchAgent, Indicator, Stock, StockAgent } from "./types";
import { ctime } from "./utils";


export function replenish<T>(name: Indicator, exp: number, fetch: FetchAgent<Stock<T>>, ctx: Indicator, persist:StockAgent<T>, opts: CacheOption, init?: T,):Promise<Stock<T>> {
    let now = ctime()
    function legit(data: T|undefined, exp: number, ctxn: string, ctxp: string) {
        return data !== undefined && exp >= now && ctxn == ctxp && !opts.update
    }

    let meta = Promise.resolve(ctx()).then(data => Promise.resolve(name(data)).then(n => { return { name_: n, ctx_: data } }))
    if (init!==undefined){
        return meta.then(({name_, ctx_})=>{
            let data = {data:init, exp: now+exp, ctx: ctx_}
            persist.set(name_, data)
            return data
        })
    }
    return meta.then(
        ({name_, ctx_})=>{
            return persist.get(name_).then(
                data=>legit(data.data, exp, ctx_, data.ctx)
                ?data:fetch().then(res=>{
                    persist.set(name_, res)
                    opts.update = false
                    return res
                }))
        })
}


export function expire<T>(name: Indicator, exp: number, persist:StockAgent<T>, ctx?:Indicator,){
    let meta
    if (ctx!=undefined){
        meta = Promise.resolve(ctx()).then((c)=>name(c))
    }else{
        meta = Promise.resolve(name())
    }
    return meta.then(n=>persist.expire(n, exp))
}


export function clear<T>(name: Indicator, persist: StockAgent<T>, ctx?:Indicator){
    let meta
    if (ctx!=undefined){
        meta = Promise.resolve(ctx()).then((c)=>name(c))
    }else{
        meta = Promise.resolve(name())
    }
    return meta.then(n=>persist.clear(n))
}