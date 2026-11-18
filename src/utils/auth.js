export const getAccessToken = () => localStorage.getItem('accessToken');
export const setAccessToken = (token) => localStorage.setItem('accessToken', token);
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setRefreshToken = (token) => localStorage.setItem('refreshToken', token);
export const getUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

export const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Clean up legacy keys if they exist
  localStorage.removeItem('qurbani_logged_in');
  localStorage.removeItem('qurbani-demo-auth');
};
