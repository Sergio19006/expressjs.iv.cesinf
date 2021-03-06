import { lorem } from 'faker'
import { connect, disconnect } from '../../../core'
import { Post } from '../../../models'
import { PostDto, PostOwnerDto } from '../../../../../dtos'
import { testingDtoPostOwners } from './../../../../../../test/fixtures'

import { create } from '../../post.mongodb.requests'

describe('[ORM] MongoDB - Posts - create', () => {
  beforeAll(async () => {
    await connect()
  })

  beforeEach(async () => {
    await Post.deleteMany({})
  })

  afterAll(async () => {
    await Post.deleteMany({})
    await disconnect()
  })

  it('must persist the new user successfully', async (done) => {
    const body = lorem.paragraph()
    const owner = testingDtoPostOwners[0] as PostOwnerDto
    const basicPost = { body, owner, comments: [], likes: [] }

    const createdPost = await create(basicPost) as PostDto

    const expectedFields = ['_id', 'body', 'owner', 'comments', 'likes', 'createdAt', 'updatedAt']
    const createdPostFields = Object.keys(createdPost).sort()
    expect(createdPostFields.sort()).toEqual(expectedFields.sort())

    expect(createdPost._id).not.toBeNull()
    expect(createdPost.body).toBe(basicPost.body)

    const expectedPostOwnerFields = ['_id', 'userId', 'name', 'surname', 'avatar', 'createdAt', 'updatedAt']
    const createdOwnerPostFields = Object.keys(createdPost.owner).sort()
    expect(createdOwnerPostFields.sort()).toEqual(expectedPostOwnerFields.sort())
    const { _id, createdAt, updatedAt, ...otherPersistedPostOwnerFields } = createdPost.owner
    expect(otherPersistedPostOwnerFields).toStrictEqual(basicPost.owner)

    expect(createdPost.comments).toStrictEqual(basicPost.comments)
    expect(createdPost.likes).toStrictEqual(basicPost.likes)
    expect(createdPost.createdAt).not.toBeNull()
    expect(createdPost.updatedAt).not.toBeNull()

    done()
  })
})
