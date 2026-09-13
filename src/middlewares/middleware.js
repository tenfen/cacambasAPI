import { sha256 } from 'js-sha256';

export default (req, res, next) => {

    // if (req.url !== '/') {

    //     const { authorization } = req.headers

    //     if (!!authorization) {

    //         const accessToken = authorization.replace('Bearer', '').trim()

    //         const current_date = new Date();
    //         const token = sha256('desenvolvimento@exactcode.com.br-' + current_date.getDate());

    //         if (accessToken !== token) {
    //             res.unauthorized('Token Inválido!')
    //         } else {
    //             next()
    //         }
    //     } else {
    //         res.badRequest('Token não informado!')
    //     }
    // } else {
    //     next()
    // }

    next()
}