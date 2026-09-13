/**
 * Rotas de autenticação.
 */
import { Router } from 'express';
import { signIn, signOut, refreshToken, autenthicate } from '../../controllers/auth.js';

const router = Router();

router.post('/signin', signIn);
router.get('/signout', signOut);
router.get('/refreshtoken', refreshToken);
router.post('/autenthicate', autenthicate)

export default router;