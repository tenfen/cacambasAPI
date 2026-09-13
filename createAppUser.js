import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import UsersModel from './src/models/users.js';

const MONGO_URI = "mongodb+srv://crtenfen_db_user:NdlSLr3tdn17dKin@cluster0.gcgxxkc.mongodb.net/";
const MONGO_DB = "cacambas";

async function createAppUser() {
  try {
    await mongoose.connect(`${MONGO_URI}/${MONGO_DB}`);
    console.log('Conectado ao MongoDB');

    const email = 'user@teste.com';
    const password = '123456';

    // Verificar se já existe
    const existing = await UsersModel.findOne({ userEmail: email });

    if (existing) {
      // Atualizar senha
      const hashedPassword = await bcrypt.hash(password, 10);
      await UsersModel.updateOne(
        { userEmail: email },
        { $set: { userPass: hashedPassword, userActive: true } }
      );
      console.log('\n✅ Senha atualizada para usuário existente!');
    } else {
      // Criar novo
      const lastUser = await UsersModel.findOne({}).sort({ userId: -1 }).limit(1);
      const userId = lastUser ? lastUser.userId + 1 : 1;

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new UsersModel({
        userId: userId,
        userName: 'Usuario',
        userLastname: 'Teste',
        userActive: true,
        userPass: hashedPassword,
        userPhone: 48999464807,
        userEmail: email,
        userRole: 'user', // Role normal de usuário do app
        userAddressId: null
      });

      await newUser.save();
      console.log('\n✅ Novo usuário do app criado!');
    }

    console.log('\n=== CREDENCIAIS DE LOGIN DO APP ===');
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log('====================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

createAppUser();
