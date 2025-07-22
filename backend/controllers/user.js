const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const axios = require('axios');
const { request } = require("axios");
const { disconnect } = require("mongoose");

exports.userCheckEmail = (req, res, next) => {
  const emailToCheck = req.body.email;
  // console.log("emailToCheck is:");
  // console.log(emailToCheck);
  User.findOne({ email: emailToCheck })
    .then(user => {
      // console.log("user is:");
      // console.log(user);
      if (user) {
        res.status(200).json({ exists: true, provider: user.provider, hasPassword: user.password !== '' });
        // console.log("user exists!!!");
      } else {
        res.status(200).json({ exists: false });
        // console.log("user not exists!!!");
      }
    })
    .catch(err => {
      res.status(500).json({
        message: 'Create_user_faild-checking-email-existence',
      });
    });
};

exports.googleLogin = (req, res, next) => {
  const APP_ID = process.env.GOOGLE_APP_ID;
  const host = req.get('host');
  const REDIRECT_URI = `https://${host}/api/user/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/auth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
  res.status(200).json({ "url": url });
}

exports.googleLoginCallback = async (req, res, next) => {
  // Exchange authorization code for access token
  const APP_ID = process.env.GOOGLE_APP_ID;
  const APP_SECRET = process.env.GOOGLE_APP_SECRET;
  const code = req.query.code;
  let host = req.get('host');
  const REDIRECT_URI = `https://${host}/api/user/auth/google/callback`;
  host = host.split(":")[0]
  const url = `https://oauth2.googleapis.com/token?code=${code}&client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${REDIRECT_URI}&grant_type=authorization_code`;
  axios.post(url)
    .then(response => {
      // console.log("response is:");
      // console.log(response.data);
      axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.data.access_token}`)
        .then(profile => {
          profile = profile.data;
          // console.log("profile is:");
          // console.log(profile);
          profile.provider = "google";
          profile.firstName = profile.given_name
          profile.lastName = profile.familyName
          handleAuthCallback(profile, res, req);
        })
        .catch(err => {
          // console.log("error in getting profile");
          // console.log(err);
          // console.log(response);
          return res.redirect(`https://${host}/login`)
        })
    })
    .catch(err => {
      // console.log("error in getting access token");
      // console.log(err);
      return res.redirect(`https://${host}/login`)
    })
}

exports.facebookLogin = (req, res, next) => {
  const APP_ID = process.env.FACEBOOK_APP_ID;
  const host = req.get('host');
  const REDIRECT_URI = `https://${host}/api/user/auth/facebook/callback`;
  const url = `https://www.facebook.com/v13.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=email`;
  res.status(200).json({ "url": url });
}

exports.facebookLoginCallback = async (req, res, next) => {
  // Exchange authorization code for access token
  const APP_ID = process.env.FACEBOOK_APP_ID;
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  const code = req.query.code;
  let host = req.get('host');
  const REDIRECT_URI = `https://${host}/api/user/auth/facebook/callback`;
  host = host.split(":")[0];

  axios.get(`https://graph.facebook.com/v13.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}&redirect_uri=${REDIRECT_URI}`)
    .then(access_token => {
      access_token = access_token.data.access_token;
      // console.log("access_token is:");
      // console.log(access_token);
      axios.get(`https://graph.facebook.com/v13.0/me?fields=id,name,email&access_token=${access_token}`)
        .then(profile => {
          profile = profile.data;
          // console.log("profile is:");
          // console.log(profile);
          profile.provider = "facebook";
          handleAuthCallback(profile, res, req);
        })
        .catch(err => {
          console.log("error in getting profile");
          // console.log(err);
          return res.redirect(`https://${host}/login`)
        })
    })
    .catch(err => {
      console.log("error in getting access token");
      // console.log(err);
      return res.redirect(`https://${host}/login`)
    })
}

function handleAuthCallback(profile, res, req = null) {
  User.findOne({ email: profile.email })
    .then(user => {
      if (user) {
        userLoginInner(profile.email, '', res, req, true);
      } else {
        const user = new User({
          email: profile.email,
          password: '',
          home_printingServices_list: [''],
          home_branches_list: [''],
          provider: profile.provider,
          language: profile.locale ? profile.locale : 'he',
          roles: ['guest', 'user'],
          firstName: profile.firstName ? profile.firstName : profile.name.split(" ")[0],
          lastName: profile.lastName ? profile.lastName : profile.name.split(" ")[1],
          displayName: profile.name,
        });
        user.save()
          .then(result => {
            userLoginInner(profile.email, '', res, req, true);
          })
          .catch(err => {
            console.log(err)
            res.status(500).json({
              message: 'Create_user_faild-Invalid_auth_credentials'
            });
          });
      }

    })
    .catch(err => {
      res.status(500).json({
        message: 'Create_user_faild-checking-email-existence',
      });
    });
}

exports.createUser = (req, res, next) => {
  const user = new User({
    email: req.body.email,
    password: req.body.password,
    home_printingServices_list: [req.body.printingService],
    home_branches_list: [req.body.branch],
    provider: "local",
    language: req.body.language,
    roles: ['guest', 'user'],
    firstName: req.body.email.split("@")[0],
    displayName: req.body.email.split("@")[0],
  });
  console.log("user in createUser is:");
  console.log(user);
  user
    .save()
    .then(result => {
      userLoginInner(req.body.email, req.body.password, res);
    })
    .catch(err => {
      res.status(500).json({
        message: 'Create_user_faild-Invalid_auth_credentials'
      });
    });
};

exports.userLogin = (req, res, next) => {
  userLoginInner(
    req.body.email,
    req.body.password,
    res,
    null,  // req
    false,  // providerLogin
    req.body.printingService,
    req.body.branch
  );
}

userLoginInner = (
  enteredEmail,
  enteredPassword,
  res, req = null,
  providerLogin = false,
  printingService = '',
  branch = '') => {
  printingService = printingService || '';
  branch = branch || '';
  let fetchedUser;
  let updateFields = {};
  let host = req ? req.get('host').split(":")[0] : '';
  User.findOne({ email: enteredEmail })
    .then(user => {
      if (!user) {
        return res.status(401).json({
          message: 'Auth_faild-Email_dosnt_exist'
        })
      }
      console.log("user in userLoginInner is:");
      console.log(user);
      fetchedUser = user;
      const hashedIncomingPassword = user.hashPassword(enteredPassword);
      return providerLogin || hashedIncomingPassword.toString() === user.password.toString();
    })
    .then(result => {
      if (!result) {
        return res.status(401).json({
          message: 'Auth_faild-Wrong_password'
        })
      }
      const token = jwt.sign(
        {
          email: fetchedUser.email,
          userId: fetchedUser._id,
          roles: fetchedUser.roles,
        },
        process.env.JWT_KEY,
        { expiresIn: "24h" }
      );
      const expiresIn = 86400;
      // check if needs to update place
      if (printingService && printingService !== '' && branch && branch !== '') {
        const allPrintingServiceIndexes = [];
        fetchedUser.home_printingServices_list.forEach((thisPrintingService) => {
          if (thisPrintingService === printingService) {
            allPrintingServiceIndexes.push(true);
          } else {
            allPrintingServiceIndexes.push(false);
          }
        });
        const allBranchesIndexes = [];
        fetchedUser.home_branches_list.forEach((thisBranch) => {
          if (thisBranch === branch) {
            allBranchesIndexes.push(true);
          } else {
            allBranchesIndexes.push(false);
          }
        });
        if (fetchedUser.home_printingServices_list[0] === '' || fetchedUser.home_branches_list[0] === '') {
          updateFields.home_printingServices_list = [printingService];
          updateFields.home_branches_list = [branch];
        } else {
          updateFields.home_printingServices_list = [...fetchedUser.home_printingServices_list];
          updateFields.home_branches_list = [...fetchedUser.home_branches_list];
          for (let i = 0; i < fetchedUser.home_printingServices_list.length; i++) {
            if (allPrintingServiceIndexes[i] && allBranchesIndexes[i]) {
              updateFields.home_printingServices_list.splice(i, 1);
              updateFields.home_branches_list.splice(i, 1);
            }
          }
          updateFields.home_printingServices_list = [printingService, ...updateFields.home_printingServices_list];
          updateFields.home_branches_list = [branch, ...updateFields.home_branches_list];
          if (updateFields.home_printingServices_list.length > 4 || updateFields.home_branches_list.length > 4) {
            updateFields.home_printingServices_list.splice(4, 1);
            updateFields.home_branches_list.splice(4, 1);
          }
        }
        if (Object.keys(updateFields).length > 0) {
          User.updateOne({ _id: fetchedUser._id }, { $set: updateFields })  // Use fetchedUser._id instead of userId
            .then(result => {
              console.log("USER PLACE UPDATED SUCCESSFULLY");
            })
            .catch(error => {
              res.status(500).json({ message: 'Update_users_last_places-Not_authorized' });
            });
        }
      } else {
        updateFields.home_printingServices_list = [];
        updateFields.home_branches_list = [];
      }
      // // check if needs to update place
      let return_json = {
        token: token,
        expiresIn: expiresIn,
        userId: fetchedUser._id,
        home_printingServices_list: fetchedUser.home_printingServices_list,
        home_branches_list: fetchedUser.home_branches_list,
        provider: fetchedUser.provider,
        language: fetchedUser.language,
        roles: fetchedUser.roles,
        userName: fetchedUser.username,
        email: fetchedUser.email,
      };
      if (providerLogin && req) {
        return res.redirect(`https://${host}/social?token=${token}&expiresIn=${expiresIn}&userId=${fetchedUser._id}&home_printingServices_list=${fetchedUser.home_printingServices_list}&home_branches_list=${fetchedUser.home_branches_list}&provider=${fetchedUser.provider}&language=${fetchedUser.language}&roles=${fetchedUser.roles}&userName=${fetchedUser.username}`);
      } else {
        return res.status(200).json(return_json);
      }

    })
    .catch(err => {
      console.log(err)
      return res.status(401).json({
        message: 'Auth_faild-Invalid_auth_credentials'
      })
    });
}

exports.getUsers = (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const searchValue = req.query.search;
  let UserQuery;

  const isPhoneNumber = /^[\d+\-\s]+$/.test(searchValue);

  let searchCriteria;
  if (isPhoneNumber) {
    const cleanedValue = searchValue.replace(/[+\-\s]/g, '');
    const phoneNumber = parseInt(cleanedValue, 10);
    searchCriteria = [{ phone: phoneNumber }];
  } else {
    searchCriteria = [
      { email: { $regex: searchValue, $options: 'i' } },
      { username: { $regex: searchValue, $options: 'i' } }
    ];
  }

  if (searchValue) {
    // console.log("searchCriteria: ", searchCriteria);
    UserQuery = User.find({ $or: searchCriteria }).sort({ created: -1 });
  } else {
    // console.log("Value is NaN: ", searchValue);
    UserQuery = User.find().sort({ created: -1 });
  }

  // console.log("UserQuery: ", UserQuery);
  let fetchedUsers;
  if (pageSize && currentPage) {
    UserQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }

  UserQuery
    .then(documents => {
      fetchedUsers = documents;
      console.log("Fetched Users: ", fetchedUsers); // Log the fetched users
      if (searchValue) {
        // Count documents based on the search criteria
        const countCriteria = { $or: searchCriteria };
        return User.countDocuments(countCriteria);
      } else {
        // Count all documents
        return User.countDocuments();
      }
    })
    .then(count => {
      res.status(200).json({
        message: "Users fetched successfully!",
        users: fetchedUsers,
        maxUsers: count
      });
    })
    .catch(error => {
      console.error("Error fetching users:", error);
      res.status(500).json({
        message: "Get_users-Fetching_users_failed"
      });
    });
};

exports.getUser = (req, res, next) => {
  console.log("req.params.id");
  console.log(req.params.id);
  User.findById(req.params.id)
    .then(user => {
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: "Get_user-Fetching_user_failed" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Get_user-Fetching_user_failed"
      });
    });
};

exports.deleteUser = (req, res, next) => {
  User.deleteOne({ _id: req.params.id })
    .then(result => {
      if (result.deletedCount > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({ message: "Delete_user-Deleting_user_failed" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "Delete_user-Deleting_user_failed"
      });
    });
};

exports.updateUserPlace = (req, res, next) => {
  const userId = req.body.id;
  const printingService = req.body.printingService;
  const branch = req.body.branch;
  console.log("allBranchesIndexes1 PLACE BEFORE");
  console.log("allBranchesIndexes1 printingService", printingService);
  console.log("allBranchesIndexes1 branch", branch);
  const updateFields = {};
  if (!printingService || !branch || printingService === '' || branch === '') {
    return res.status(200).json({ message: 'No need to update branch' });
  }
  // let fetchedUser;
  User.findOne({ _id: req.body.id })
    .then(user => {
      if (!user) {
        return res.status(200).json({ message: 'No user found' });
      }
      // fetchedUser = user;
      const allPrintingServiceIndexes = [];
      user.home_printingServices_list.forEach((thisPrintingService) => {
        if (thisPrintingService === printingService) {
          allPrintingServiceIndexes.push(true);
        } else {
          allPrintingServiceIndexes.push(false);
        }
      });
      const allBranchesIndexes = [];
      user.home_branches_list.forEach((thisBranch) => {
        if (thisBranch === branch) {
          allBranchesIndexes.push(true);
        } else {
          allBranchesIndexes.push(false);
        }
      });
      console.log("allBranchesIndexes2 fetchedUser.home_printingServices_list", user.home_printingServices_list)
      console.log("allBranchesIndexes2 fetchedUser.home_branches_list", user.home_branches_list)
      console.log("allBranchesIndexes2", allPrintingServiceIndexes, allBranchesIndexes)
      if (user.home_printingServices_list[0] === '' || user.home_branches_list[0] === '') {
        updateFields.home_printingServices_list = [printingService];
        updateFields.home_branches_list = [branch];
      } else {
        updateFields.home_printingServices_list = [...user.home_printingServices_list];
        updateFields.home_branches_list = [...user.home_branches_list];
        for (let i = 0; i < user.home_printingServices_list.length; i++) {
          if (allPrintingServiceIndexes[i] && allBranchesIndexes[i]) {
            updateFields.home_printingServices_list.splice(i, 1);
            updateFields.home_branches_list.splice(i, 1);
          }
        }
        updateFields.home_printingServices_list = [printingService, ...updateFields.home_printingServices_list];
        updateFields.home_branches_list = [branch, ...updateFields.home_branches_list];
        if (updateFields.home_printingServices_list.length > 4 || updateFields.home_branches_list.length > 4) {
          updateFields.home_printingServices_list.splice(4, 1);
          updateFields.home_branches_list.splice(4, 1);
        }
      }
      console.log("updateFields!!!!!!!!! PLACE AFTER");
      console.log(printingService);
      console.log(branch);
      console.log(updateFields);
      if (Object.keys(updateFields).length > 0) {
        User.updateOne({ _id: userId }, { $set: updateFields })
          .then(result => {
            if (result && result.matchedCount > 0) {
              res.status(200).json({
                message: 'Update successful!',
                home_printingServices_list: updateFields.home_printingServices_list,
                home_branches_list: updateFields.home_branches_list
              });
            } else {
              res.status(401).json({ message: 'Update_users_last_places-Not_authorized' });
            }
          })
          .catch(error => {
            res.status(500).json({ message: 'Update_users_last_places-Not_authorized' });
          });
      } else {
        res.status(200).json({ message: 'No fields to update' });
      }
    })
    .catch(error => {
      console.error(error);
      return res.status(500).json({ message: 'Update_users_last_places-Not_authorized' });
    });
};

exports.updateUserLanguage = (req, res, next) => {
  const userId = req.body.id;
  const newLanguage = req.body.language;
  if (!newLanguage || newLanguage === '') {
    return res.status(200).json({ message: 'No need to update language' });
  }
  User.findOne({ _id: userId })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'Update_users_language-Not_authorized' });
      }
      user.language = newLanguage;
      return user.save();
    })
    .then(updatedUser => {
      if (updatedUser) {
        res.status(200).json({ message: 'Update successful!', user: updatedUser });
      } else {
        res.status(401).json({ message: 'Update_users_language-Not_authorized' });
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Update_users_language-Not_authorized' });
    });
};

exports.updateUserManagement = (req, res, next) => {
  const updateFields = {
    email: req.body.email,
    provider: req.body.provider,
    language: req.body.language,
    isBMBranches: req.body.isBMBranches,
    isSU: req.body.isSU,
    updated: new Date(),
  };
  if (Object.keys(updateFields).length > 0) {
    User.updateOne({ _id: req.body.id }, { $set: updateFields })
      .then(result => {
        if (result && result.matchedCount > 0) {
          res.status(200).json({ message: 'Update successful!' });
        } else {
          res.status(401).json({ message: 'Update_user-Not_authorized' });
        }
      })
      .catch(error => {
        res.status(500).json({ message: 'Update_user-Not_authorized' });
      });
  } else {
    res.status(200).json({ message: 'No fields to update' });
  }
};

exports.updateUserProfile = (req, res, next) => {
  let numberedPhone;
  if (req.body.phone && req.body.phone !== '') {
    numberedPhone = Number(req.body.phone.replace(/\D/g, ''));
  }
  const updateFields = {
    displayName: req.body.displayName,
    email: req.body.email,
    phone: numberedPhone,
    updated: new Date(),
  };
  console.log(updateFields);
  if (Object.keys(updateFields).length > 0) {
    User.updateOne({ _id: req.body.id }, { $set: updateFields })
      .then(result => {
        if (result && result.matchedCount > 0) {
          // Find the updated user and return it
          User.findOne({ _id: req.body.id })
            .then(user => {
              res.status(200).json({ message: 'Update successful!', user: user });
            });
        } else {
          res.status(401).json({ message: 'Update_user-Not_authorized' });
        }
      })
      .catch(error => {
        res.status(500).json({ message: 'Update_user-Not_authorized' });
      });
  } else {
    res.status(200).json({ message: 'No fields to update' });
  }
}

exports.updateUserProfileManiger = (req, res, next) => {
  let numberedPhone;
  if (req.body.phone && req.body.phone !== '') {
    numberedPhone = Number(req.body.phone.replace(/\D/g, ''));
  }
  const updateFields = {
    displayName: req.body.displayName,
    email: req.body.email,
    phone: numberedPhone,
    discount: req.body.discount ? req.body.discount : 0,
    roles: req.body.roles,
    updated: new Date(),
  };
  console.log("updateFields updateUserProfileManiger", updateFields);
  if (Object.keys(updateFields).length > 0) {
    User.updateOne({ _id: req.body.id }, { $set: updateFields })
      .then(result => {
        if (result && result.matchedCount > 0) {
          // Find the updated user and return it
          User.findOne({ _id: req.body.id })
            .then(user => {
              res.status(200).json({ message: 'Update successful!', user: user });
            });
        } else {
          res.status(401).json({ message: 'Update_user-Not_authorized' });
        }
      })
      .catch(error => {
        res.status(500).json({ message: 'Update_user-Not_authorized' });
      });
  } else {
    res.status(200).json({ message: 'No fields to update' });
  }
}

exports.updateUserPhone = (req, res, next) => {
  let numberedPhone;
  if (req.body.phone && req.body.phone !== '') {
    numberedPhone = Number(req.body.phone.replace(/\D/g, ''));
  }
  const updateFields = {
    phone: numberedPhone,
    updated: new Date(),
  };
  console.log(updateFields);
  if (Object.keys(updateFields).length > 0) {
    User.updateOne({ _id: req.body.id }, { $set: updateFields })
      .then(result => {
        if (result && result.matchedCount > 0) {
          // Find the updated user and return it
          User.findOne({ _id: req.body.id })
            .then(user => {
              res.status(200).json({ message: 'Update User Phone successful!', user: user });
            });
        } else {
          res.status(401).json({ message: 'Update_user-Not_authorized' });
        }
      })
      .catch(error => {
        res.status(500).json({ message: 'Update_user-Not_authorized' });
      });
  } else {
    res.status(200).json({ message: 'No fields to update' });
  }
}

exports.setCC = function (req, res, next) {
  var cc = req.body.cc;
  if (req.body.id) {
    if (cc.exp_m && cc.exp_y && cc.num && cc.cvv && cc.id && cc.name) {
      User.findById(req.body.id).then(user => {
        console.log(process.env.zCredit);
        if (user) {
          var json = {
            "TerminalNumber": process.env.zCreditTerminalNumber,
            "Password": process.env.zCreditPassword,
            "CardNumber": cc.num,
            "ExpDate_MMYY": cc.exp_m + "" + cc.exp_y.substr(-2, 2)
          };
          console.log(json);
          // post
          axios.post(process.env.zCreditTokenizeUrl, json).then(response => {
            console.log(response.data);
            if (response.data.HasError) {
              var transaction = new Transaction({
                sum: 0,
                user: user.username,
                orderID: null,
                userID: user._id,
                responseText: response.data.ReturnMessage,
                responseCode: response.data.ReturnCode,
              });
              transaction.save();
              res.status(422).send({ message: response.data.ReturnMessage });
            } else {
              user.zCreditInfo.token = response.data.Token;
              user.zCreditInfo.cardNum = response.data.CardNumber.substr(-4, 4);
              user.zCreditInfo.cvv = cc.cvv;
              user.zCreditInfo.cardExp = response.data.ExpDate_MMYY;
              user.zCreditInfo.cardName = response.data.CardName;
              user.zCreditInfo.customerName = cc.name;
              // user.zCreditInfo.customerPhone = req.body.CustomerPhone;
              user.zCreditInfo.customerID = cc.id;
              user.zCreditInfo.customerEmail = user.email;
              user.save().then(result => {
                res.status(200).send({
                  user: user,
                })
              });
            }

          }).catch(err => {
            console.error("err", err)
            res.status(422).send({ message: 'TOKENIZATION_ERROR' });

          })

        } else {
          res.status(422).send({
            message: 'USER_CANT_BE_FOUND'
          });
        }
      }).catch(err => {
        console.error("err", err)
        res.status(422).send({
          message: 'USER_CANT_BE_FOUND'
        });
      });
    } else {
      res.status(422).send({
        message: 'MISSING_DATA'
      });
    }
  } else {
    res.status(401).send({
      message: 'NO_LOGGED_IN_USER'
    });
  }
};

exports.deleteCC = function (req, res, next) {
  var cc = req.body.cc;
  if (req.body.id) {
    if (cc.token && cc.cardNum && cc.cardExp && cc.cvv) {
      User.findById(req.body.id).then(user => {
        if (user) {
          // Clear the credit card information
          user.zCreditInfo = {
            token: null,
            cardNum: null,
            cvv: null,
            cardExp: null,
            cardName: null,
            customerName: null,
            customerID: null,
            customerEmail: user.email
          };

          user.save().then(result => {
            res.status(200).send({
              message: 'Credit card information deleted successfully',
              user: user,
            });
          }).catch(err => {
            console.error("err", err);
            res.status(500).send({ message: 'INTERNAL_SERVER_ERROR' });
          });

        } else {
          res.status(422).send({
            message: 'USER_CANT_BE_FOUND'
          });
        }
      }).catch(err => {
        console.error("err", err);
        res.status(422).send({
          message: 'USER_CANT_BE_FOUND'
        });
      });
    } else {
      res.status(422).send({
        message: 'MISSING_DATA'
      });
    }
  } else {
    res.status(401).send({
      message: 'NO_LOGGED_IN_USER'
    });
  }
};

exports.deleteCCManiger = async function (req, res, next) {
  try {
    if (!req.body.id) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    const user = await User.findById(req.body.id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Clear the credit card information
    user.zCreditInfo = {
      token: null,
      cardNum: null,
      cvv: null,
      cardExp: null,
      cardName: null,
      customerName: null,
      customerID: null,
      customerEmail: user.email
    };

    await user.save();
    res.status(200).send({
      message: 'Credit card information deleted successfully',
      user: user,
    });
  } catch (err) {
    console.error("err", err);
    res.status(500).send({ message: 'INTERNAL_SERVER_ERROR' });
  }
};

exports.updatePoints = async function (req, res, next) {
  console.log("updatePoints");
  try {
    const userId = req.params.id; // Extract userId from URL parameters
    const { action, points } = req.body; // Extract action and points from request body

    // Validate action
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // Find the user by _id
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update points based on action
    if (action === 'add') {
      user.points += points;
    } else if (action === 'remove') {
      user.points -= points;
      if (user.points < 0) {
        user.points = 0;
      }
    }

    // Save the updated user
    await user.save();

    // Send a response back to the client
    res.status(200).json({ message: 'Points updated successfully', user });
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
};