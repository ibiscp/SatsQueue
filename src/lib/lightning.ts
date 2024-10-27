import { LightningAddress } from "@getalby/lightning-tools";
import { bech32 } from "bech32";

export const isValidLNURL = async (url: string) => {
  try {
    // Check if it's a lightning address (contains @)
    if (url.includes('@')) {
      const ln = new LightningAddress(url);
      await ln.fetch();
      return !!ln.lnurlpData || !!ln.keysendData;
    }
    
    // Check if it's a LNURL
    if (url.toLowerCase().startsWith('lnurl') || url.toLowerCase().startsWith('lightning:')) {
      console.log('Validating LNURL:', url);
      
      // Remove lightning: prefix if present and get clean LNURL string
      let cleanUrl = url.toLowerCase();
      if (cleanUrl.startsWith('lightning:')) {
        cleanUrl = cleanUrl.slice(10); // Remove 'lightning:'
      }

      try {
        // Decode LNURL using bech32
        const { words } = bech32.decode(cleanUrl, 2000);
        const requestBytes = bech32.fromWords(words);
        const decoded = new TextDecoder().decode(new Uint8Array(requestBytes));
        console.log('Decoded URL:', decoded);
        
        // Validate URL format
        const isValidUrl = /^https?:\/\/.+$/i.test(decoded);
        console.log('Is valid URL format:', isValidUrl);
        
        if (!isValidUrl) {
          console.log('Invalid URL format, returning false');
          return false;
        }

        // Attempt to fetch the LNURL endpoint
        console.log('Fetching LNURL endpoint...');
        const response = await fetch(decoded);
        if (!response.ok) {
          console.log('Failed to fetch LNURL endpoint');
          return false;
        }
        
        const data = await response.json();
        console.log('LNURL endpoint response:', data);
        
        // Check for valid LNURL-pay response format
        const isValid = data && (data.tag === 'payRequest' || data.callback);
        console.log('Is valid LNURL:', isValid);
        return isValid;
      } catch (error) {
        console.error('Error processing LNURL:', error);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error("Error validating LNURL:", error);
    return false;
  }
}

export type InvoiceResult = {
  invoice: any;  // Replace with proper type from LightningAddress
  error: string | null;
};

export const generateInvoice = async (
  lnurl: string,
  amount: number
): Promise<InvoiceResult> => {
  console.log('Generating invoice for amount:', amount);
  
  if (amount <= 0) {
    return {
      invoice: null,
      error: 'Amount must be greater than 0'
    };
  }

  try {
    // Try as Lightning Address first
    if (lnurl.includes('@')) {
      const ln = new LightningAddress(lnurl);
      await ln.fetch();
      const invoice = await ln.requestInvoice({ satoshi: amount });
      return {
        invoice,
        error: null
      };
    }
    
    // Try as LNURL
    try {
      // Decode LNURL using bech32
      const { words } = bech32.decode(lnurl, 2000);
      const requestBytes = bech32.fromWords(words);
      const decoded = new TextDecoder().decode(new Uint8Array(requestBytes));

      // Fetch the LNURL endpoint
      const response = await fetch(decoded);
      if (!response.ok) {
        throw new Error('Failed to fetch LNURL endpoint');
      }

      const data = await response.json();
      
      // Get callback URL and generate invoice
      if (!data.callback) {
        throw new Error('Invalid LNURL-pay response');
      }

      const callbackUrl = new URL(data.callback);
      callbackUrl.searchParams.append('amount', (amount * 1000).toString()); // Convert to millisats

      const invoiceResponse = await fetch(callbackUrl.toString());
      if (!invoiceResponse.ok) {
        throw new Error('Failed to get invoice from LNURL endpoint');
      }

      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.pr) {
        throw new Error('No payment request in LNURL response');
      }

      return {
        invoice: {
          paymentRequest: invoiceData.pr,
          isPaid: async () => {
            // Basic implementation - could be enhanced
            return false;
          }
        },
        error: null
      };

    } catch (err) {
      throw new Error(`Invalid LNURL: ${err.message}`);
    }

  } catch (err) {
    return {
      invoice: null,
      error: `Failed to generate Lightning invoice: ${err.message}`
    };
  }
};
