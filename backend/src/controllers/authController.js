// backend/src/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = user => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'secret',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    },
  );
};

// Check if user exists by Firebase UID
const checkFirebaseUser = async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    if (!firebaseUid) {
      return res.status(400).json({
        error: 'Firebase UID is required',
      });
    }

    const user = await User.findOne({
      where: { firebaseUid },
    });

    if (user) {
      // User exists, return user data and generate token
      const token = generateToken(user);
      return res.status(200).json({
        exists: true,
        message: 'User found',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          photoURL: user.profilePhoto,
        },
      });
    } else {
      // User doesn't exist, needs to complete registration
      return res.status(200).json({
        exists: false,
        message: 'User not found, needs registration',
      });
    }
  } catch (error) {
    console.error('Error checking Firebase user:', error);
    res.status(500).json({ error: 'Error checking user: ' + error.message });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Validaciones
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        error: 'Todos los campos son requeridos',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Las contraseñas no coinciden',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres',
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'El email ya está registrado',
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
    });

    // Generar token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en signup:', error);
    res.status(500).json({
      error: 'Error al registrar el usuario',
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son requeridos',
      });
    }

    // Buscar usuario
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Email o contraseña incorrectos',
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(403).json({
        error:
          'Tu cuenta ha sido deshabilitada. Contacta al administrador para más información.',
      });
    }

    // Comparar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Email o contraseña incorrectos',
      });
    }

    // Actualizar último login
    await user.update({
      lastLogin: new Date(),
    });

    // Generar token
    const token = generateToken(user);

    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photoURL: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error al iniciar sesión',
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      error: 'Error al obtener el usuario',
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
    });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({
      error: 'Error al refrescar el token',
    });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { idToken, email, name, photo } = req.body;

    // Log para debugging
    console.log('Google Auth Request:', {
      idToken: idToken ? 'present' : 'missing',
      email,
      name,
      photo,
    });

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        name,
        email,
        phone: '', // Valor por defecto para Google Auth
        photo,
        password: 'google_auth', // Valor por defecto para Google Auth
        role: 'user',
        isActive: true,
      });
      console.log('New user created from Google:', user.id, email);
    } else {
      console.log('Existing user found:', user.id, email);
      if (!user.isActive) {
        return res.status(403).json({
          error:
            'Tu cuenta ha sido deshabilitada. Contacta al administrador para más información.',
        });
      }
    }

    const token = generateToken(user);

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in googleAuth:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify phone number with Firebase OTP
 * POST /auth/verify-phone
 */
const verifyPhoneOTP = async (req, res) => {
  try {
    const { firebaseUid, phone, email, name, photoURL } = req.body;

    if (!firebaseUid || !phone || !email) {
      return res.status(400).json({
        error: 'Firebase UID, phone number, and email are required',
      });
    }

    // Find or create user with Firebase UID
    let user = await User.findOne({
      where: { firebaseUid },
    });

    if (!user) {
      // Create new user from Firebase with the data sent from frontend
      user = await User.create({
        name: name || 'Usuario', // Use the name from frontend
        email: email, // Use the actual Google email
        phone,
        firebaseUid,
        profilePhoto: photoURL || null, // Save the photo URL from Google
        password: firebaseUid, // Use Firebase UID as temporary password
        role: 'user', // New users are always 'user'
      });

      console.log('✅ New user created from Firebase:', {
        id: user.id,
        name: user.name,
        email: user.email,
        photoURL: photoURL ? 'YES' : 'NO',
        firebaseUid: user.firebaseUid,
      });
    } else {
      // Update user with latest data from frontend
      await user.update({
        name: name || user.name,
        email: email || user.email,
        phone,
        profilePhoto: photoURL || user.profilePhoto,
      });

      console.log('✅ User updated:', {
        id: user.id,
        name: user.name,
        email: user.email,
        photoURL: photoURL ? 'YES' : 'NO',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: 'Phone verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photoURL: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ error: 'Error verifying phone: ' + error.message });
  }
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  refreshToken,
  googleAuth,
  checkFirebaseUser,
  verifyPhoneOTP,
};
