const mongoose = require("mongoose"),
    crypto = require('crypto'),
    validator = require('validator');

const uniqueValidator = require("mongoose-unique-validator");

// A Validation function for local strategy properties
var validateLocalStrategyProperty = function (property) {
    return ((this.provider !== 'local' && !this.updated) || property.length);
};

// A Validation function for local strategy email
var validateLocalStrategyEmail = function (email) {
    return ((this.provider !== 'local' && !this.updated) || validator.isEmail(email, { require_tld: false }));
};

const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        default: '',
    },
    lastName: {
        type: String,
        trim: true,
        default: '',
    },
    displayName: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        index: {
            unique: true,
            sparse: true // For this to work on a previously indexed field, the index must be dropped & the application restarted.
        },
        lowercase: true,
        trim: true,
        default: '',
        validate: [validateLocalStrategyEmail, 'EMAIL_IS_INVALID']
    },
    username: {
        type: String,
        default: '',
        // unique: 'USERNAME_IS_NOT_UNIQUE',
        // required: 'USERNAME_IS_MANDATORY',
        lowercase: true,
        trim: true,
    },
    home_branch: {
        type: String,
        default: '',
    },
    home_printingServices_list: {
        type: Array,
        default: [''],
    },
    home_branches_list: {
        type: Array,
        default: [''],
    },

    // home_express: { type: Schema.ObjectId, ref: 'Express' },
    gender: {
        type: String,
        trim: true,
        default: '',
    },
    phone: {
        type: Number,
        trim: true,
        validate: [validateLocalStrategyProperty, 'PHONE_IS_INVALID']
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    city: {
        type: String,
        trim: true,
        default: ''
    },
    password: {
        type: String,
        default: ''
    },
    salt: {
        type: String
    },
    profileImageURL: {
        type: String,
        // default: '/modules/users/client/img/profile/default.png'
    },
    provider: {
        type: String,
        required: 'Provider is required'
    },
    providerData: {},
    additionalProvidersData: {},
    roles: {
        type: [{
            type: String,
            enum: ['guest', 'user', 'admin', 'st', 'bm', 'su', 'business']
        }],
        default: ['guest'],
        required: 'Please provide at least one role'
    },
    updated: {
        type: Date
    },
    created: {
        type: Date,
        default: Date.now
    },
    /* For reset password */
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    zCreditInfo: {
        token: String,
        approvalNumber: String,
        sum: Number,
        cvv: {
            type: String,
            default: ''
        },
        currency: Number,
        payments: Number,
        cardNum: Number,
        cardName: String,
        cardExp: String,
        customerID: Number,
        customerName: String,
        customerPhone: String,
        customerEmail: String,
        customerBusinessID: Number,
    },
    isConfirmed: {
        type: Boolean,
        default: true,
    },
    points: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    confirmationToken: String,
    language: {
        type: String,
        default: "en"
    },
    beamConfigurations: {
        type: Object,
        default: {}
    },
});

userSchema.pre('save', function (next) {
    if (this.password && this.isModified('password')) {
        this.salt = crypto.randomBytes(16).toString('base64');
        this.password = this.hashPassword(this.password);
    }
    next();
});
userSchema.pre('validate', function (next) {
    if (!this.firstName.length) {
        this.firstName = this.email.split("@")[0];
        this.displayName = this.email.split("@")[0];
    }
    if (!this.username.length) {
        this.username = this.email;
    }
    next();
});

userSchema.methods.hashPassword = function (password) {
    if (this.salt && password) {
        return crypto.pbkdf2Sync(password, new Buffer(this.salt, 'base64'), 10000, 64, 'SHA1').toString('base64');
    } else {
        return password;
    }
};

// userSchema.plugin(uniqueValidator);

// ייצוא המודל עם שם קולקשן מפורש 'users' (כמו ב-MongoDB)
module.exports = mongoose.model("User", userSchema, "users");





