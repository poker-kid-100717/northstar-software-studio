// Legacy entry point: keep the same durable, verified intake in either build root.
// Production Pages builds use web/functions.
export { onRequestGet, onRequestPost } from '../../web/functions/api/consultation-inquiries';
