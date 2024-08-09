
const UTF8TextDecoder = new TextDecoder("utf-8");
const UTF8TextEncoder = new TextEncoder("utf-8");
function utf8Encoder() {
    return UTF8TextEncoder;
}
function utf8Decoder() {
    return UTF8TextDecoder;
}

export function Net() {
    this.sender   = null;
    this.receiver = null;
}


export function World() {
    this.dimensions = [0, 0];
}


export function Context() {
    this.net = new Net();
    this.world = new World();
}

let globalCtx = null;

export function init() {
    globalCtx = new Context();
}

export function worldDimensionsAreKnown(ctx) {
    const dimensions = ctx.world.dimensions;
    return dimensions[0] != 0 && 
            dimensions[1] != 0;
}

export function ctx()
{
    return globalCtx;
}

export function world()
{
    return globalCtx.world;
}

let nextThingID = 0;
function Thing(ctx)
{
   this.id = ++nextThingID;
   this.mttID = 0;
}
export function Thing_make(ctx)
{
    return new Thing(ctx);
}
export function Thing_isValid(t)
{
    return t.mttID != 0;
}



const TYPE_STRING_LITERAL = "MTT_T_STRING";
const TYPE_INIT = "MTT_INIT";
const TYPE_REQUEST_ID = "MTT_REQUEST_ID";
const TYPE_UPDATE         = "MTT_UPDATE";

let pendingIDRequestID = 0;
let pendingIDRequests = new Map();

function Request(ctx, callback) {

    this.ctx = ctx;
    let resolve_= null;
    let reject_ = null;
    
    this.promise = new Promise((resolve, reject) => {
        resolve_ = resolve;
        reject_  = reject;
    })

    this.resolve  = resolve_;
    this.reject   = reject_;
    this.callback = callback;
}


export function messageSendEncodeUTF8(ctx, msg)
{
    ctx.net.sendProcedure(
        ctx.net.sender,
        utf8Encoder().encode(
            msg
        )
    );
}


export function requestWorldInfo(ctx) {
    messageSendEncodeUTF8(ctx,`{"type":"MTT_INIT"}\r\n`);
}
export function requestID(ctx, callback) {
    if (!callback) {
        throw new Error("Make The Thing requestID: missing argument - expected callback to receive requested ID");
    }
    pendingIDRequestID += 1;
    messageSendEncodeUTF8(ctx,`{"type":"${TYPE_REQUEST_ID}","reqID":${pendingIDRequestID}}\r\n`);

    const request = new Request(ctx, callback);

    pendingIDRequests.set(pendingIDRequestID, request);
    

    return request.promise;
}

let events = [];
export function foreachEvent(ctx, handler)
{
    handler(ctx, events);
    events = [];
}

export function messageHandleIncomingJSON(ctx, msg)
{
    if (msg.type == TYPE_STRING_LITERAL) {
        //console.log("MTT msg:", msg);
    } else if (msg.type == TYPE_REQUEST_ID) {
        const request = pendingIDRequests.get(msg.reqID);
        if (!request) {
            console.error("Make The Thing missing request");
            return;
        } else {
            if (request.callback) {
                request.callback(msg.id);
            }
            request.resolve();
            pendingIDRequests.delete(msg.reqID);
        }
    } else if (msg.type == TYPE_UPDATE) {
        events.push(msg);
    } else if (msg.type == TYPE_INIT) {
        console.log("MTT received initialization info");
        const dimensions = ctx.world.dimensions;
        dimensions[0] = msg.w;
        dimensions[1] = msg.h;
    }
} 

export function messageHandleIncoming(world, msg) 
{
}
