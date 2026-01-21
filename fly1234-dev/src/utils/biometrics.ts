/**
 * Utility for Biometric Authentication (WebAuthn)
 */

export const isBiometricSupported = async (): Promise<boolean> => {
    if (!window.PublicKeyCredential) return false;

    try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch {
        return false;
    }
};

export const registerBiometrics = async (userId: string, email: string) => {
    if (!window.PublicKeyCredential) {
        throw new Error('Biometric authentication is not supported on this device.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userID = new TextEncoder().encode(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: "Fly4All",
            id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        },
        user: {
            id: userID,
            name: email,
            displayName: email,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
    };

    const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
        throw new Error('Failed to create biometric credential.');
    }

    // In a real production app, we would send the credential to the server to verify and store the public key.
    // For this implementation, we'll store the credential ID as proof of registration.
    return btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
};

export const verifyBiometrics = async (credentialIdBase64: string) => {
    if (!window.PublicKeyCredential) {
        throw new Error('Biometric authentication is not supported on this device.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credentialId = Uint8Array.from(atob(credentialIdBase64), c => c.charCodeAt(0));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
            id: credentialId,
            type: 'public-key',
        }],
        userVerification: "required",
        timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
        throw new Error('Biometric verification failed.');
    }

    return true;
};
