import type { CacheAgent, CacheOption, FetchAgent, Indicator, Stock } from "./types";
import { ctime, delay } from "./utils";

export function shelf<T>(fetch:FetchAgent<Stock<T>>, ctx: Indicator, exp:number, opts: CacheOption, init?:T):CacheAgent<T>{
    let cache = init
    let cached = () => cache !==undefined

    if (cached()) cache = <T>init

    let _ctx = ''
    if (cached()) Promise.resolve(ctx()).then(c=>_ctx=c)

    let _exp: number = ctime()
    if (cached()) _exp += exp

    let fetching = false

    function legit(){
        let now = ctime()
        let predicate = !opts.update&&now<=_exp&&cached()&&!fetching
        return Promise.resolve(ctx()).then(c=>c==_ctx&&predicate)
    }
    
    function _get(stop: number): Promise<Stock<T>>{
        return legit().then(
            _legit => {
                if(_legit) return {data: <T>cache, ctx: _ctx, exp: _exp}
                let now = ctime()
                if (!fetching){
                    fetching = true
                    return fetch().then(
                        data=>{
                            cache = data.data
                            _exp=data.exp
                            _ctx=data.ctx
                            opts.update = false
                            fetching = false
                            return data
                        })
                }
                if (now>stop) return Promise.reject()
                return delay(opts.delay).then(()=>_get(stop))
            })
    }

    function get(){
        let stop = ctime() + opts.timeout
        return _get(stop)
    }

    function set(data: T, expipre?:number, context?: string):Promise<Stock<T>>{
        return Promise.resolve(context??ctx())
            .then(c=>_ctx=c)
            .then(()=>{
                _exp = expipre??ctime()+exp
                cache=data
                return {data: cache, ctx: _ctx, exp: exp}
            })
    }

    function expire(n:number){
        _exp+=n
        return Promise.resolve(_exp)
    }

    function clear(){
        let snapshot = {data: <T>cache, ctx: _ctx, exp: exp}
        _exp = -1
        cache = undefined
        _ctx = ''
        return Promise.resolve(snapshot)
    }

    function _data(){
        return get().then(s=>s.data)
    }

    return {
        get, set, expire, clear, 
        get data() {
            return _data()
        }
    }

}