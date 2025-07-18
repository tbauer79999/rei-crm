// src/lib/suppressLogs.js

if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  // You can optionally leave console.error active for error visibility:
  // console.error = () => {};
}
