export let setTextureToChannel = channel => {
  // If this is the first time we set the texture channel, define the global var
  if (window.txtrChannel === undefined) {
    window.txtrChannel = [channel];
    window.lastChannel = channel;
  }

  // If this channel hasn't been used, push this channel
  if (!window.txtrChannel.includes(channel))
    window.txtrChannel.push(channel);
  window.lastChannel = channel;
}

export let getArbitraryChannel = () => {
  // If this is the first time we set the texture channel, define the global var and returns 0
  if (window.txtrChannel === undefined) {
    window.txtrChannel = [1];
    window.lastChannel = 1;
    return 1;
  }

  // Iterate throught the channel list to find any available channel
  for (let i = 1; i < 15; i++) {
    if (!window.txtrChannel.includes(i))
      return i;
  }

  // If there is no available slot, use the next channel from the last used channel
  if (window.lastChannel == 15) 
    return 1;
  else
    return window.lastChannel + 1;
}