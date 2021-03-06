import { connect, disconnect } from '../../../core'
import { Post } from '../../../models'
import { PostDto } from '../../../../../dtos'
import { testingLikedAndCommentedPersistedDtoPosts } from '../../../../../../test/fixtures'

import { getAll } from '../../post.mongodb.requests'

describe('[ORM] MongoDB - Posts - getAll', () => {
  const mockedPosts = testingLikedAndCommentedPersistedDtoPosts

  beforeAll(async () => {
    await connect()
    await Post.insertMany(mockedPosts)
  })

  afterAll(async () => {
    await Post.deleteMany({})
    await disconnect()
  })

  it('must retrieve the whole persisted posts', async (done) => {
    const persistedPosts = await getAll() as PostDto[]

    expect(persistedPosts).toHaveLength(persistedPosts.length)

    persistedPosts.forEach((post) => {
      const expectedFields = ['_id', 'body', 'owner', 'comments', 'likes', 'createdAt', 'updatedAt']
      const getAlldPostFields = Object.keys(post).sort()
      expect(getAlldPostFields.sort()).toEqual(expectedFields.sort())

      const expectedPost = mockedPosts.find((mockedPost) => mockedPost._id === post._id?.toString()) as PostDto

      expect(post).toStrictEqual<PostDto>(expectedPost)
    })

    done()
  })
})
