const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const validator = require('validator');

const SALT_ROUNDS = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 12;

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        maxlength: [254, 'Email too long'],
        validate: {
            validator: function (v) {
                return validator.isEmail(String(v || '').trim());
            },
            message: 'Please provide a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [10, 'Password must be at least 10 characters'],
        select: false
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Phone is too long'],
        validate: {
            validator: function (v) {
                if (!v) return true;
                try {
                    const pn = parsePhoneNumberFromString(String(v));
                    return !!(pn && pn.isValid());
                } catch (err) {
                    return false;
                }
            },
            message: 'Please provide a valid phone number'
        }
    },
    image: {
        type: String,
        default: null,
        validate: {
            validator: function (v) {
                if (!v) return true;
                return validator.isURL(v, { protocols: ['http', 'https'] });
            },
            message: 'Please provide a valid image URL'
        }
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    userStatus: {
        type: String,
        enum: ['approved', 'denied', 'pending'],
        default: 'pending'
    },
    markets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Market' }],
    totalMarketAmount: {
        type: Number,
        default: 0,
        min: [0, 'Total market amount cannot be negative']
    },
    totalMeal: {
        type: Number,
        default: 0,
        min: [0, 'Total meal count cannot be negative']
    },
    meals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
    guestMeal: { type: Number, default: 0, min: [0, 'Cannot be negative'] },
    payment: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    gasBill: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    lastLogin: Date,
    lastLoginIP: String,
    lastLoginUA: String,
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    deleteIfNotApproved: { type: Date, default: null }
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.password;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.lockUntil;
            delete ret.loginAttempts;
            return ret;
        }
    }
});

// INDEXES - Database level optimization
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
userSchema.index({ role: 1, userStatus: 1, createdAt: -1 });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });
userSchema.index(
    { deleteIfNotApproved: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: {
            userStatus: { $in: ['denied', 'pending'] },
            deleteIfNotApproved: { $ne: null }
        }
    }
);

// VIRTUALS - Computed properties
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('isApproved').get(function () {
    return this.userStatus === 'approved';
});

// PRE-SAVE HOOKS - Data transformation only
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre('save', function (next) {
    if (this.isModified('email') && this.email) {
        const normalized = validator.normalizeEmail(String(this.email).trim(), {
            gmail_remove_dots: false
        });
        if (normalized) this.email = normalized;
    }

    if (this.isModified('phone') && this.phone) {
        try {
            const pn = parsePhoneNumberFromString(String(this.phone));
            if (!pn || !pn.isValid()) {
                const err = new mongoose.Error.ValidationError(this);
                err.addError('phone', new mongoose.Error.ValidatorError({
                    message: 'Please provide a valid phone number'
                }));
                return next(err);
            }
            this.phone = pn.number;
        } catch (err) {
            const vErr = new mongoose.Error.ValidationError(this);
            vErr.addError('phone', new mongoose.Error.ValidatorError({
                message: 'Invalid phone number'
            }));
            return next(vErr);
        }
    }
    next();
});

// SIMPLE INSTANCE METHODS - Only data-level operations
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// STATIC METHODS - Simple queries only
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
    return !!(await this.findOne({
        email: email.toLowerCase(),
        _id: { $ne: excludeUserId }
    }).collation({ locale: 'en', strength: 2 }));
};

// ARRAY SIZE VALIDATION
userSchema.path('markets').validate(function (v) {
    return !v || v.length <= 200;
}, 'Markets array too large');

userSchema.path('meals').validate(function (v) {
    return !v || v.length <= 200;
}, 'Meals array too large');

const User = mongoose.model('User', userSchema);
module.exports = User;