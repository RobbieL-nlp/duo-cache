import { shelf } from "./cache";
import { replenish } from "./persist";
import type { CacheOption, Config, FetchConfig, Indicator, Stock, StockConfig, Cache, MutCache } from "./types";
import { ctime } from "./utils";

function label<T>(data:T, ctx: Indicator, exp: number):Promise<Stock<T>>{
    return Promise.resolve(ctx()).then(c=>{
        return {data: data, ctx: c, exp: ctime()+exp}
    })
}

function compose<S, T=S>(f: FetchConfig<S, T>, ctx:Indicator, exp:number, opts:CacheOption, s?:StockConfig<T>, init?:T){
    
    let agent = () => f.agent().catch(f.reject).then(f.resolve).then(data=>label(data, ctx, exp))
    if (s!=undefined){
        agent = ()=>replenish(s.name, exp, agent, ctx, s.agent, opts, init)
    }
    return shelf(agent, ctx, exp, opts, init)
}

export function cache<S, T=S>(conf:Config<S, T>, init: T ): Cache<T>{
    let opts: CacheOption = {
        update: false,
        delay: conf.delay,
        timeout: conf.timeout
    }
    let agent = compose(conf.fetch, conf.ctx, conf.exp, opts, conf.persist, init)

    function get(update=false){
        opts.update = update
        return agent.get()
    }

    function ttl(){
        return get().then(data=>data.exp - ctime())
    }

    return {
        get,
        toUpdate: () => opts.update = true, 
        expire: (n:number)=> agent.expire(n),
        clear: agent.clear,
        data: agent.data,
        get ttl(){return ttl()}
    }
}

export function mcache<S, T=S>(conf:Config<S, T>, init: T ):MutCache<T>{

    let opts: CacheOption = {
        update: false,
        delay: conf.delay,
        timeout: conf.timeout
    }
    let agent = compose(conf.fetch, conf.ctx, conf.exp, opts, conf.persist, init)

    function get(update=false){
        opts.update = update
        return agent.get()
    }

    function ttl(){
        return get().then(data=>data.exp - ctime())
    }

    function set(data:T, exp?: number, ctx?: Indicator,){
        return Promise.resolve((ctx??conf.ctx)())
            .then(c=>{
                return {
                    data: data, ctx: c, 
                    exp: exp??ctime()+conf.exp
                }
            })
    }

    return {
        get, set, 
        get ttl(){return ttl()},
        toUpdate: () => opts.update = true, 
        expire: (n:number)=> agent.expire(n),
        clear: agent.clear,
        data: agent.data
    }
}

