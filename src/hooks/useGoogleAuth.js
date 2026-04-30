import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { findOrCreateSheet } from '../utils/sheetsHelper';

const TOKEN_KEY = 'sw_access_token';
const USER_KEY = 'sw_user_info';
const SHEET_KEY = 'sw_sheet_id';
const TOKEN_EXP_KEY = 'sw_token_exp';

export function useGoogleAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    const exp = localStorage.getItem(TOKEN_EXP_KEY);
    if (exp && Date.now() > parseInt(exp)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  });
  const [sheetId, setSheetId] = useState(() => localStorage.getItem(SHEET_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initSheet = useCallback(async (accessToken) => {
    try {
      const id = await findOrCreateSheet(accessToken);
      setSheetId(id);
      localStorage.setItem(SHEET_KEY, id);
      return id;
    } catch (e) {
      setError('Failed to connect to Google Sheet: ' + e.message);
      return null;
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = tokenResponse.access_token;
        const expiry = Date.now() + (tokenResponse.expires_in || 3600) * 1000;

        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await userRes.json();

        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(TOKEN_EXP_KEY, String(expiry));
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

        setToken(accessToken);
        setUser(userInfo);

        await initSheet(accessToken);
      } catch (e) {
        setError('Login failed: ' + e.message);
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => setError('Google login error: ' + (err.error_description || err.error || 'Unknown')),
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file openid email profile',
  });

  useEffect(() => {
    if (token && !sheetId) {
      initSheet(token);
    }
  }, [token, sheetId, initSheet]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SHEET_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    setUser(null);
    setToken(null);
    setSheetId(null);
  }, []);

  return { user, token, sheetId, loading, error, login, logout };
}
