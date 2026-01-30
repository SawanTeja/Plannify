import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId:
      "690723040085-8mmpou6mbpmamathrlos0hc40bp4ke1l.apps.googleusercontent.com",
    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    offlineAccess: true, // Crucial for getting idToken
  });
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    // COMPATIBILITY FIX: 
    // Different versions of the library return data in different places.
    // We check both to be safe.
    const idToken = response.idToken || response.data?.idToken;
    const user = response.user || response.data?.user;

    if (!idToken) {
      throw new Error("No ID Token found. Ensure 'offlineAccess: true' is set.");
    }

    // Return a unified structure that AppContext expects
    return {
      idToken: idToken,
      user: user,
      originalResponse: response // Keep original just in case
    };

  } catch (error) {
    // 1. Handle User Cancellation gracefully
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log("User cancelled the login flow");
      return null;
    }

    // 2. Handle specific errors
    if (error.code === statusCodes.IN_PROGRESS) {
      console.log("Sign in is in progress already");
      return null;
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log("Play services not available or outdated");
    } else {
      console.error("Google Sign-In Error:", error);
    }

    // 3. Throw other errors so the UI shows an alert
    throw error;
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error(error);
  }
};

export const getCurrentUser = async () => {
  try {
    const userInfo = await GoogleSignin.getCurrentUser();
    return userInfo;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getGoogleAccessToken = async () => {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error("Error getting access token", error);
    throw error;
  }
};