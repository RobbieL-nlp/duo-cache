# DuoCache: Two Level Cache Factory

DuoCache is a module providing two level (in-memory and persistence) cache for saving resources like network connections, database quering, etc., meanwhile it keeps away the risks of loosing in-memory data(e.g. application reload) by utilizing a persistent storage. DuoCache supports context switching/listening and expiration according to time and number of stock (TODO). Example usages would be stroing auth info or other contextual data in a web application.

## Install

```bash
npm install duocache
```

## Overview

Consider cache data as some good for sale, a shelf (in-memory cache) is a place providing direct and quick access to the data; and once the good on shelf becomes invalid, a stock agent will checkout the stock (persistent). If the good is out of stock either, a fetch agent will contact the data source (e.g. remote database) to update the data.  

### Notes

- For data that does not need persistence, one can neglect the stock process by setting the persist config to undefined.
- Use undefined to denote unset case, since some cache data can be null type.
- This module provides simple templates for stock agents and fetch agent, and provide apis for customization. If needed, one might implement a specific agent according to interfaces. see usage for details.

## Usage

Using browser's localStorage as stock base and an arbitrary http client return a promise of data, here's a typical example of setting up and usage in a case that caching suggestion data according to preference context: 

### 1. Load a stock agent and a fetch agent
```ts
    let fetchAgent = someFetchAgent // (...args)=>Promise<T>
    let stockAgent = someStockAgent // StockAgent<T>
```

### 2. configure the cache
```ts

    let preference = () => 'preference id 1'

    let conf = {
        exp: 5*60*1000, // the cache will expire in 5 mins after load
        ctx: preference, // a function returns a string representing context
        fetch: { // conf for fetch process
            agent: fetchAgent, // nominate a fetch agent
            /* transform data after fetch from source*/
            resolve: (data:number)=>data.toString() 
        },
        persist: {
            /* a function return name as a key for stock during store and lookup */
            name: (ctx:string, )=> `data_according_to_pref.${ctx}`,
            agent: stockAgent // nominate a stock agent
        },
        /* 3s timeout for a fetch request, if it does not respond within 3s,
         the promise will reject */  
        timeout: 3*1000,
        /* 
        during fetch, if aother agent is currently holding the fetch lock,
        the current agent will wait some time before try again, it is set to 1s here. 
        */
        delay: 1*1000 
    }

```

### 3. compose the cache and interact
```ts
    /* simply compose the cache object using conf */
    let suggestion = cache(conf, ) 

    /* to get the Promise of cache info in form of {data:T, ctx:string, exp:number }  */
    suggestion.get().then(stock=>{
        console.log(stock.data, 'cached data')
        console.log(stock.exp, 'cache will expire at')
        console.log(stock.ctx, 'cache is for ... context')
    })

    /* or if one wants to update the suggestion with a new remote fetch*/
    suggestion.get(update=true)

```
- for the purpose of saving resources, the update = true, and there is another agent fetching the data, the current agent will wait and return the data from another agent, instead of initing another connection. 

### For lazy update:
```ts
    suggestion.toUpdate() //()=>void
```
This will set the update switch to true, and a new remote fetch will establish during next access. 

### To reset the cache to expire in n ms:
```ts
    let n = 10*60*1000 // expire in 10 mins
    suggestion.expire(n).then(exp=>console.log('cache expires at ', exp))

```
- a negative n will immediately expire the cache, and 0 probably has the same immediate expiration effect in most cases, since it will basically set the exipration time to current time.

### To clear the cache on shelf and in stock:
```ts

    suggestion.clear().then(
        console.log(stock.data, 'cached data')
        console.log(stock.exp, 'cache expire at')
        console.log(stock.ctx, 'cache is for ... context')
    )

```
- returns a Promise of removed cache stock.
- since only one set of cache stock (see types.) is kept on shelf (for now) for one same cache instance (suggestion variable reference to), clear will reset all data in memory for different contexts. However, for persistent level cache, if the name used contains the context info, then this operation only clear the persistent cache of current context.

### To access cache data directly:
```ts
    suggestion.data.then(data=>console.log('cache has data', data))
```

### To access time left before cache expires:
```ts
    suggestion.ttl.then(data=>console.log('cache will expire in', data))
```

### If one needs to set the data manually after init:
```ts
    let mutableCache = mcache(conf,) // return a MutCache<T>
    mutableCache.set(data,).then(stock=>{
        console.log(stock.data, 'data set')
        console.log(stock.exp, 'set cache expire at')
        console.log(stock.ctx, 'set cache is for ... context')
    })
```
- the set method also accept exp and ctx args for one time use, if specified, the expire time is set to exp directly, and if ctx provided results in a different string compared to the current context, then this cache probably will not last long in memory since the cache agent will load the correct data for the current context, unless the context changes to the provided one before next access.
- If not specified, the expire and context will reset according to default behaior of cache init.


### Compose cache with init data:
```ts

    let suggestion = cache(conf, init)

```
- available for both types of cache  

### Implementation for stock agent and fetch agent  

Implementations should implement according these interfaces:

```ts
    interface Stock<T>{
        data: T
        exp: number // expire at
        ctx: string // a key for context switching
    }

    interface StockAgent<T> {
        set: (name: string, data:Stock<T>) => Promise<Stock<T>>
        get: (name: string) => Promise<Stock<T>>
        expire: (name: string, n: number) => Promise<number>
        clear: (name: string)=>Promise<Stock<T>>
    }

    interface FetchAgent<T>{
        ():Promise<T>
    }
    
```

A ***PSEUDO*** implementation using localStorage would be:

```ts
    class Agent implement StockAgent<T>{

        get(name){
            let storage = localStorage.getItem(name)
            
            let stock = Json.parse(storage) // hopefully parse to a Stock obj

            return Promise.resolve(stock)
        }

        set(name, data){
            let stock = Json.stringify(data)
            localStorage.setItem(stock)
            return Promise.resolve(stock)
        }

        expire(name, n){

            let storage = localStorage.getItem(name)
            
            let stock = Json.parse(storage) // hopefully parse to a Stock obj

            stock.exp += n
            localStorage.setItem(stock)

            return Promise.resolve(stock.exp)
        }

        clear(name){
            let storage = localStorage.getItem(name)
            let stock = Json.parse(storage)
            localStorage.removeItem(name)
            return Promise.resolve(stock)
        }

    }



```


## Types and explainations

```ts

    interface Stock<T>{
        data: T
        exp: number
        ctx: string
    }
    /* *
     *@params name: key to use with set and get 
     *@params n: extend the expiration to n s
     */
    interface StockAgent<T> {
        set: (name: string, data:Stock<T>) => Promise<Stock<T>>
        get: (name: string) => Promise<Stock<T>>
        expire: (name: string, n: number) => Promise<number>
        clear: (name: string)=>Promise<Stock<T>>
    }

    /**
     * @param exp in set: set the expiration to exp 
     * @param ctx: context
     * @param n in expire: extend the expiration to n s
     */
    interface CacheAgent<T> {
        set: (data:T, exp?:number, ctx?:string) => Promise<Stock<T>>
        get: () => Promise<Stock<T>>
        expire: (n: number) => Promise<number>
        clear: ()=>Promise<Stock<T>>
        data: Promise<T>
    }

    interface FetchAgent<T>{
        ():Promise<T>
    }

    interface Indicator{
        (data?:unknown, ...args:unknown[]):Promise<string> | string
    }

    /**
     * @property name: the first arg is always a string comes from context
     */
    interface StockConfig<T> {
        name: Indicator
        agent: StockAgent<T>
    }

    /**
     * @property resolve: transform fetch data to another form to store and use
     * @property reject: exception handler for exceptions during fetching from remote
     */
    interface FetchConfig<S, T = S> {
        agent: FetchAgent<S>
        resolve?: (data: S) => T | Promise<T>
        reject?: (data: unknown) => any
    }


    interface Config<S, T = S> {
        exp: number
        ctx: Indicator
        fetch: FetchConfig<S, T>
        persist: StockConfig<T>
        timeout: number
        delay: number
    }


    interface Cache<T> {
        get: (update:boolean) => Promise<Stock<T>>
        toUpdate: () => void
        expire: (n: number) => Promise<number>
        clear: ()=>Promise<Stock<T>>
        data: Promise<T>
        ttl: Promise<number>
    }

    interface MutCache<T> extends Cache<T> {
        set: (data: T) => Promise<Stock<T>>
    }


    function cache<S, T=S>(conf:Config<S, T>, init: T ): Cache<T>
    function mcache<S, T=S>(conf:Config<S, T>, init: T ):MutCache<T>



```









