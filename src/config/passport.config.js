import passport from 'passport'
import local from 'passport-local'
import GitHub from 'passport-github2'
import UserModel from '../models/users.model.js'
import { createHash, isValidPassword } from '../utils.js'
import { getUserEmail, registerUser } from '../services/users.js'

const LocalStrategy = local.Strategy
const GitHubStrategy = GitHub.Strategy

const initializePassport = () => {

    //? Estrategia de Registro

    passport.use('register', new LocalStrategy(
        {
            passReqToCallback: true,
            usernameField: 'email'
        },
        async (req, username, password, done) => {
            try {
                const user = await getUserEmail(username)
                if (user) {
                    console.log('El Usuario ya existe')
                    return done(null, false)
                }

                req.body.password = createHash(password)

                const newUser = await registerUser({ ...req.body })

                if (newUser) {
                    console.log(newUser)
                    return done(null, newUser)
                }
                return done(null, false)

            } catch (error) {
                console.log(error)
                done(error)
            }
        }
    ))

    //? Estrategia de Login

    passport.use('login', new LocalStrategy(
        { usernameField: 'email' },
        async (username, password, done) => {
            try {
                const user = await getUserEmail(username)
                if (!user) {
                    console.error('User dont exist', username)
                    return done(null, false)
                }
                if (!isValidPassword(user, password)) {
                    console.error('Invalid password')
                    return done(null, false)
                }
                return done(null, user)

            } catch (error) {
                return done('Error login', error);
            }
        }))

    //? Serialization and Descerialization Users

    passport.serializeUser((user, done) => {
        done(null, user._id)
    })

    passport.deserializeUser(async (id, done) => {
        const user = await UserModel.findById(id)
        done(null, user)
    })

    //? GitHub login

    passport.use('github', new GitHubStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                
                const email = profile._json.email
                const user = await getUserEmail(email)
                if (user) {
                    return done(null, user)
                }
                const newUser = {
                    firstName: profile._json.name,
                    email,
                    password: '.$',
                    image: profile._json.avatar_url,
                    github: true,
                }
                const result = await registerUser({...newUser})
                return done(null, result)
            } catch (error) {
                return done('Error GitHub-login', error);
            }
        }))
}

export default initializePassport
