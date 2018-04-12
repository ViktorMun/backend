import {Authorized, BadRequestError, Body, CurrentUser, Get, JsonController, Param, Post, Patch, Delete, NotFoundError} from "routing-controllers";
import {Profile} from "../profiles/entity";
import {IsEmail, IsString, MinLength} from "class-validator";
import {User} from "./entity";

class ValidateSignupPayload extends Profile {

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

}

@JsonController()
export default class UserController {

  @Authorized()
  @Get('/users/:id([0-9]+)')
  getUser(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ) {
    if(currentUser.id === id) {
      return User.find({
        where: {id},
        relations: ['products', 'orders', 'profile']
      })
    }

    return User.find({
      where: {id}
    })
  }

  @Authorized()
  @Get('/admin/users/pending')
  async getPendingUsers(
    @CurrentUser() currentUser: User
  ) {
    if(!(currentUser.role === 'admin')) throw new BadRequestError('You are not authorized to use this route.')
    const users = await User.find()
    if (!users) throw new NotFoundError(`No Users so far!`)
    const unapprovedUsers = users.filter(users => users.approved === false)
    return unapprovedUsers
  }

  @Authorized()
  @Patch('/admin/users/:id')
  async changeUserInformation(
    @CurrentUser() currentUser: User,
    @Param('id') id: number,
    @Body() updates: Partial<User>
  ) {
    if(!(currentUser.role === 'admin')) throw new BadRequestError('You are not authorized to use this route.')
    const user = await User.findOneById(id)
    if (!user) throw new NotFoundError(`User does not exist!`)
    const changedUser = await User.merge(user!, updates).save()
    return changedUser
  }

  @Authorized()
  @Patch('/admin/users/:id/approve')
  async approveUser(
    @CurrentUser() currentUser: User,
    @Param('id') id: number,
  ) {
    if(!(currentUser.role === 'admin')) throw new BadRequestError('You are not authorized to use this route.')
    const user = await User.findOneById(id)
    if (!user) throw new NotFoundError(`User does not exist!`)
    user!.approved = true
    return user!.save()
  }

  @Authorized()
  @Delete('/admin/users/:id')
  async deleteUser(
    @CurrentUser() currentUser: User,
    @Param('id') id: number,
  ) {
    if(!(currentUser.role === 'admin')) throw new BadRequestError('You are not authorized to use this route.')
    const user = await User.findOneById(id)
    if (!user) throw new NotFoundError(`User does not exist!`)
    await user.remove()
    return {
      message: "You succesfully deleted the user!"
    }
  }

  @Authorized()
  @Get('/users')
  getAllUsers(
    @CurrentUser() currentUser: User
  ) {
    if(!(currentUser.role === 'admin')) throw new BadRequestError('You are not authorized to use this route.')

    return User.find()
  }

  @Post('/users')
  async createUser(
    @Body() body: ValidateSignupPayload
  ) {
    const {email, password, ...profile} = body

    const profileEntity = await Profile.create(profile).save()
    const userEntity = User.create({email, approved: true})

    await userEntity.setPassword(password)
    userEntity.profile = profileEntity

    return userEntity.save()
  }

}
