export let setTextureToChannel = channel => {
  // If this is the first time we set the texture channel, define the global var
  if (window.txtrChannel === undefined) {
    window.txtrChannel = [channel];
    window.lastChannel = channel;
    return channel;
  }

  // If this channel hasn't been used, return this channel
  if (!window.txtrChannel.includes(channel)) {
    window.lastChannel = channel;
    return channel;
  }

  // Else, cache the intended channel and iterate through all channels
  let channelCache = channel;
  channel++;

  // The loop stops when an empty slot is found, or there's no available channel
  // in that case, we will just use the intended channel
  // 15 remains untouched, because it will be used for drop down menu
  while (window.txtrChannel.includes(channel) && channel != channelCache) {
    channel++;
    if (channel == 15) channel = 0;
  }

  // If a new slot is found, push this channel to the existing channel
  if (channel != channelCache) window.txtrChannel.push(channel); 

  window.lastChannel = channel;
  return channel;
}

export let getArbitraryChannel = () => {
  // If this is the first time we set the texture channel, define the global var and returns 0
  if (window.txtrChannel === undefined) {
    window.txtrChannel = [0];
    window.lastChannel = 0;
    return 0;
  }

  // Iterate throught the channel list to find any available channel
  for (let i = 0; i < 15; i++) {
    if (!window.txtrChannel.includes(i)) {
      window.txtrChannel.push(i);
      return i;
    }
  }

  // If there is no available slot, use the next channel from the last used channel
  if (window.lastChannel == 15) {
    window.lastChannel = 0;
    return 0;
  }
  else{
    window.lastChannel++;
    return window.lastChannel;
  }
}