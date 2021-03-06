import supertest, { SuperTest, Test } from 'supertest'
import { lorem } from 'faker'

import { server } from '../../../server'
import { mongodb } from '../../../../orm'

import { BAD_REQUEST, OK, FORBIDDEN, UNAUTHORIZED, INTERNAL_SERVER_ERROR } from '../../../../../domain/errors'
import { PostDomainModel, PostOwnerDomainModel } from '../../../../../domain/models'
import { postDataSource } from '../../../../dataSources'
import { UserProfileDto } from '../../../../dtos'

import { testingUsers, testingValidJwtTokenForNonPersistedUser, testingExpiredJwtToken } from '../../../../../test/fixtures'

const { username, password, email, avatar, name, surname, token: validToken } = testingUsers[0]

interface TestingProfileDto extends UserProfileDto {
  password: string
}

describe('[API] - Posts endpoints', () => {
  describe('[POST] /posts/create', () => {
    const { connect, disconnect, models: { User, Post } } = mongodb

    const postBody = lorem.paragraph()
    const mockedUserData: TestingProfileDto = {
      username,
      password,
      email,
      avatar,
      name,
      surname
    }

    let request: SuperTest<Test>

    beforeAll(async () => {
      request = supertest(server)
      await connect()
      await User.deleteMany({})
      await (new User(mockedUserData)).save()
    })

    beforeEach(async () => {
      await Post.deleteMany({})
    })

    afterAll(async () => {
      await User.deleteMany({})
      await Post.deleteMany({})
      await disconnect()
    })

    it('must return OK (200) and the created post', async (done) => {
      const token = `bearer ${validToken}`

      await request
        .post('/posts/create')
        .set('Authorization', token)
        .send({ postBody })
        .expect(OK)
        .then(async ({ body }) => {
          const createdPost = body as PostDomainModel

          const expectedFields = ['id', 'body', 'owner', 'comments', 'likes', 'createdAt', 'updatedAt']
          const createdPostFields = Object.keys(createdPost).sort()
          expect(createdPostFields.sort()).toEqual(expectedFields.sort())

          expect(createdPost.id).not.toBeNull()
          expect(createdPost.body).toBe(postBody)

          const expectedPostOwnerFields = ['id', 'name', 'surname', 'avatar']
          const createdOwnerPostFields = Object.keys(createdPost.owner).sort()
          expect(createdOwnerPostFields.sort()).toEqual(expectedPostOwnerFields.sort())

          const postOwner = createdPost.owner as PostOwnerDomainModel
          expect(postOwner.id).not.toBeNull()
          expect(postOwner.name).toBe(mockedUserData.name)
          expect(postOwner.surname).toBe(mockedUserData.surname)
          expect(postOwner.avatar).toBe(mockedUserData.avatar)

          expect(createdPost.comments).toHaveLength(0)
          expect(createdPost.likes).toHaveLength(0)
          expect(createdPost.createdAt).not.toBeNull()
          expect(createdPost.updatedAt).not.toBeNull()
        })

      done()
    })

    it('must return FORBIDDEN (403) when we send an empty token', async (done) => {
      const token = ''
      const errorMessage = 'Required token was not provided'

      await request
        .post('/posts/create')
        .set('Authorization', token)
        .send({ postBody })
        .expect(FORBIDDEN)
        .then(async ({ text }) => {
          expect(text).toBe(errorMessage)
        })

      done()
    })

    it('must return UNAUTHORIZED (401) error when we send an expired token', async (done) => {
      const token = `bearer ${testingExpiredJwtToken}`
      const errorMessage = 'Token expired'

      await request
        .post('/posts/create')
        .set('Authorization', token)
        .send({ postBody })
        .expect(UNAUTHORIZED)
        .then(async ({ text }) => {
          expect(text).toBe(errorMessage)
        })

      done()
    })

    it('must return BAD_REQUEST (400) error when we send an expired token', async (done) => {
      const token = `bearer ${testingValidJwtTokenForNonPersistedUser}`
      const errorMessage = 'User does not exist'

      await request
        .post('/posts/create')
        .set('Authorization', token)
        .send({ postBody })
        .expect(BAD_REQUEST)
        .then(async ({ text }) => {
          expect(text).toBe(errorMessage)
        })

      done()
    })

    it('must return INTERNAL_SERVER_ERROR (500) when the persistance process returns a NULL value', async (done) => {
      jest.spyOn(postDataSource, 'createPost').mockImplementation(() => Promise.resolve(null))

      const token = `bearer ${validToken}`
      const errorMessage = 'Internal Server Error'

      await request
        .post('/posts/create')
        .set('Authorization', token)
        .send({ postBody })
        .expect(INTERNAL_SERVER_ERROR)
        .then(async ({ text }) => {
          expect(text).toBe(errorMessage)
        })

      jest.spyOn(postDataSource, 'createPost').mockRestore()

      done()
    })

    it('must return INTERNAL_SERVER_ERROR (500) when the persistance throws an exception', async (done) => {
      jest.spyOn(postDataSource, 'createPost').mockImplementation(() => {
        throw new Error('Testing error')
      })

      const token = `bearer ${validToken}`
      const errorMessage = 'Internal Server Error'

      await request
        .post('/posts/create')
        .set('Authorization', token)
        .send({ postBody })
        .expect(INTERNAL_SERVER_ERROR)
        .then(async ({ text }) => {
          expect(text).toBe(errorMessage)
        })

      jest.spyOn(postDataSource, 'createPost').mockRestore()

      done()
    })
  })
})
