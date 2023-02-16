export interface Stock<T>{
    data: T
    exp: number
    ctx: string
}

export interface StockAgent<T> {
    set: (name: string, data:Stock<T>) => Promise<Stock<T>>
    get: (name: string) => Promise<Stock<T>>
    expire: (name: string, n: number) => Promise<number>
    clear: (name: string)=>Promise<Stock<T>>
}

export interface CacheAgent<T> {
    set: (data:T, exp?:number, ctx?:string) => Promise<Stock<T>>
    get: () => Promise<Stock<T>>
    expire: (n: number) => Promise<number>
    clear: ()=>Promise<Stock<T>>
    data: Promise<T>
}

export interface FetchAgent<T>{
    ():Promise<T>
}

export interface Indicator{
    (data?:unknown):Promise<string> | string
}

export interface StockConfig<T> {
    name: Indicator
    agent: StockAgent<T>
}


export interface CacheOption {
    update: boolean
    timeout: number
    delay: number
}

export interface FetchConfig<S, T = S> {
    agent: FetchAgent<S>
    resolve?: (data: S) => T | Promise<T>
    reject?: (data: unknown) => any
}


export interface Config<S, T = S> {
    exp: number
    ctx: Indicator
    fetch: FetchConfig<S, T>
    persist: StockConfig<T>
    timeout: number
    delay: number
}


export interface Cache<T> {
    get: (update:boolean) => Promise<Stock<T>>
    toUpdate: () => void
    expire: (n: number) => Promise<number>
    clear: ()=>Promise<Stock<T>>
    data: Promise<T>
    ttl: Promise<number>
}

export interface MutCache<T> extends Cache<T> {
    set: (data: T) => Promise<Stock<T>>
}




