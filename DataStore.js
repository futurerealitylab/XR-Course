// this is intended to be a generic key value store in the context of low latency real-time 
// streaming - additions to this code should bear that in mind, application specific logic 
// that may not be useful to other contexts, should remain in the plugin itself, this should 
// eventually integrated to library perhaps

class DataStore {

  constructor() {
      // saved checkpoint
      this.snapshot = {};
      // deltas from snapshot in order
      this.log = [];
      // current store state
      this.state = {};
      this.state['objects'] = {};
      // TODO: additional child that may need to be initialized at startup

      // track statistics of usage
      // TODO: integrate with the functions to track usage stats
      // TODO: integrate optional timing profiling
      this.stats = {};

      // ttl timers for scheduled events
      this.timers = {};
      this.timers['lock'] = {};
      this.timers['remove'] = {};

      // three examples of metadata:
      // 1) stream || static || dynamic
      // stream - it should be broadcast at rate
      // static - store object at fixed location
      // dynamic - movable, broadcast deltas
      // 2) compressed - have a few encodings and decoding available, such as 16 bit floats,
      //              or dropping the third direction, or both, among others, such as 
      //              KTX compression, or zip, etc for large binaries
      // 3) physics
      // ... arbitrary binary data as a payload
      this.metadata = {};

      // callbacks

  }

  // compare(self, kvstore):
  //     return DeepDiff(self.state, kvstore, exclude_types={}, exclude_paths={}) == {}

  // def delta(self, kvstore):
  //     return DeepDiff(self.state, kvstore, exclude_types={}, exclude_paths={})

  // // TODO fix timers
  // def put(self, key, value, lock_ttl = None, remove_ttl = None):
  //     if lock_ttl != None:
  //         if self.timers['lock'][key]:
  //             sched.cancel(self.timers['lock'][key])
          
  //         self.timers['lock'][key] = sched.enter(lock_ttl, 1, self.unlock, argument=(key,))
      
  //     if remove_ttl != None:
  //         if self.timers['remove'][key]:
  //             sched.cancel(self.timers['remove'][key])
          
  //         self.timers['remove'][key] = sched.enter(remove_ttl, 1, self.remove, argument=(key,))
      
  //     self.state[key] = value

  clear() {
      // immediately create a snapshot of state prior to clearing
      this.snapshot = this.state;

      // TODO: finish this function

  }

  //Checks if object is locked, true if free, false if locked
  check(key) {
      //If the object or lockid doesn't even exist yet, then it is unlocked.
      if (!(key in this.state['objects']) || !('lockid' in this.state['objects'][key])) {
          return true;
      }

      //Else check to see if lockid is blank.
      return this.state['objects'][key]['lockid'] == '';
  }

  setObjectData(key, data) {
      this.state['objects'][key]['state'] = data;
      this.state['objects'][key]['dirty'] = true;
  }

  exists(key) {
      return key in this.state['objects'];
  }

  add(key) {
      this.state['objects'][key] = {};
  }

  // return key from state
  get(key) {
      return this.state['objects'][key];
  }

  remove(key) {
      delete this.state['objects'][key];
  }
  
  // attempt to acquire lock, returns true or false
  acquire(key, lockid) {
      return this.state['objects'][key]['lockid'] === -1 || this.state['objects'][key]['lockid'] === lockid;
  }

  lock(key, lockid) {
      this.state['objects'][key]['lockid'] = lockid;
  }

  unlock(key) {
      this.state['objects'][key]['lockid'] = -1;
  }

  // check if active
  active(key) {
      return this.state['objects'][key]["active"];
  }

  activate(key) {
      if (key in this.state['objects']) {
          this.state['objects'][key]["active"] = true;
      } else {
          console.log("Fun Fact: Tried activating an object that doesn't exist.")
      }
  }

  deactivate(key) {
      if (key in this.state['objects']) {
           this.state['objects'][key]["active"] = false;
      } else {
          console.log("Fun Fact: Tried deactivating object that doesn't exist.")
      }
  }
  
}

module.exports = DataStore;
