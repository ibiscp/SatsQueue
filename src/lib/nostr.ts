import { SimplePool, nip19, finalizeEvent, nip04 } from 'nostr-tools'

const nostrConfig = {
  relays: import.meta.env.VITE_NOSTR_RELAYS?.split(',') || ['wss://relay.damus.io', 'wss://relay.nostr.band'],
  privateKey: import.meta.env.VITE_NOSTR_PRIVATE_KEY || '',
}

const pool = new SimplePool()

export const getNostrName = async (input: string): Promise<{ name: string | null, pubkey: string | null }> => {
  try {
    let pubkey: string;

    if (input.startsWith('nprofile') || input.startsWith('npub')) {
      const { type, data } = nip19.decode(input);

      if (type === 'nprofile') {
        pubkey = (data as { pubkey: string }).pubkey;
      } else if (type === 'npub') {
        pubkey = data as string;
      } else {
        throw new Error('Invalid input: must be nprofile or npub');
      }
    } else if (input.includes('@')) {
      // Handle NIP-05
      const [name, domain] = input.split('@');
      const wellKnownUrl = `https://${domain}/.well-known/nostr.json?name=${name}`;

      const response = await fetch(wellKnownUrl);
      const data = await response.json();

      if (data.names && data.names[name]) {
        pubkey = data.names[name];
      } else {
        throw new Error('NIP-05 identifier not found');
      }
    } else {
      throw new Error('Invalid input: must be nprofile, npub, or NIP-05 identifier');
    }

    const event = {
      kinds: [0],
      authors: [pubkey],
    };

    const response = await pool.get(nostrConfig.relays, event);

    if (response && response.content) {
      console.log('response', response);
      try {
        const profile = JSON.parse(response.content);
        return { 
          name: profile.display_name || profile.name || null,
          pubkey: pubkey
        };
      } catch (parseError) {
        console.error('Error parsing profile content:', parseError);
        return { name: null, pubkey: pubkey };
      }
    }

    return { name: null, pubkey: pubkey };
  } catch (error) {
    console.error('Error fetching Nostr name:', error);
    return { name: null, pubkey: null };
  }
};

export const sendNostrPrivateMessage = async (recipientPubkey: string, content: string): Promise<void> => {
  try {
    if (!nostrConfig.privateKey) {
      throw new Error('Private key is not set')
    }
    const { data: sk } = nip19.decode(nostrConfig.privateKey) as { data: Uint8Array }; // Ensure sk is a string

    const encryptedContent = await nip04.encrypt(sk, recipientPubkey, content)

    const event = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientPubkey]],
      content: encryptedContent,
    }

    const signedEvent = finalizeEvent(event, sk)

    try {
      const pub = pool.publish(nostrConfig.relays, signedEvent)
      await Promise.all(pub.map(p => p.catch(() => undefined)))
      console.log('Private message sent successfully')
    } catch (error) {
      console.error('Error sending Nostr private message:', error)
      throw error
    }
  } catch (error) {
    console.error('Error sending Nostr private message:', error)
    throw error
  }
}
