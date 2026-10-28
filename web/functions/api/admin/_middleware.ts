import { authorize } from './inquiries';
import { mutationGuard } from '../../_lib/inquiry';
type Env = Parameters<typeof authorize>[1];
export const onRequest: PagesFunction<Env> = async ({request,env,next}) => {
  const denied = await authorize(request,env); if (denied) return denied;
  if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
    const guard = mutationGuard(request); if (guard) return guard;
  }
  return next();
};
