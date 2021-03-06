import { mongodb } from '../../../../infrastructure/orm'
import { postDataSource } from '../../../../infrastructure/dataSources'
import { PostDomainModel, PostLikeOwnerDomainModel } from '../../../models'
import { testingLikedAndCommentedPersistedDtoPosts, testingLikedAndCommentedPersistedDomainModelPosts } from '../../../../test/fixtures'

import { getPostLikeByOwnerId } from '../..'
import { GettingPostLikeError } from '../../../errors/PostErrors'
import { PostDto } from '../../../../infrastructure/dtos'

describe('[SERVICES] Post - getPostLikeByOwnerId', () => {
  const { connect, disconnect, models: { Post } } = mongodb

  const mockedDtoPosts = testingLikedAndCommentedPersistedDtoPosts as PostDto[]
  const mockedCompleteDtoPost = JSON.parse(JSON.stringify(mockedDtoPosts[0]))
  const mockedEmptyLikesDtoPost = JSON.parse(JSON.stringify(mockedDtoPosts[1]))
  mockedEmptyLikesDtoPost.likes = []

  const resultPosts = testingLikedAndCommentedPersistedDomainModelPosts as PostDomainModel[]
  const selectedPost = resultPosts[0]
  const selectedLike = selectedPost.likes[0]
  const selectedLikeOwnerId = selectedLike.id
  const mockedNonValidPostId = resultPosts[1].id as string
  const mockedNonValidLikeOwnerId = resultPosts[1].owner.id as string

  beforeAll(async () => {
    await connect()
    await Post.insertMany([mockedCompleteDtoPost, mockedEmptyLikesDtoPost])
  })

  afterAll(async () => {
    await Post.deleteMany({})
    await disconnect()
  })

  it('must retrieve the selected post like', async (done) => {
    const postId = selectedPost.id as string
    const ownerId = selectedLikeOwnerId

    const persistedLike = await getPostLikeByOwnerId(postId, ownerId) as PostLikeOwnerDomainModel

    const expectedFields = ['id', 'name', 'surname', 'avatar']
    const persistedLikeFields = Object.keys(persistedLike).sort()
    expect(persistedLikeFields.sort()).toEqual(expectedFields.sort())

    expect(persistedLike).toStrictEqual<PostLikeOwnerDomainModel>(selectedLike)

    done()
  })

  it('must return NULL when select a post which doesn\'t contain the provided like', async (done) => {
    const postId = mockedNonValidPostId
    const ownerId = selectedLikeOwnerId

    await expect(getPostLikeByOwnerId(postId, ownerId)).resolves.toBeNull()

    done()
  })

  it('must return NULL when provide user who has not liked the selected post', async (done) => {
    const postId = selectedPost.id as string
    const ownerId = mockedNonValidLikeOwnerId

    await expect(getPostLikeByOwnerId(postId, ownerId)).resolves.toBeNull()

    done()
  })

  it('must throw INTERNAL_SERVER_ERROR (500) when the datasource throws an unexpected error', async (done) => {
    jest.spyOn(postDataSource, 'getPostLikeByOwnerId').mockImplementation(() => {
      throw new Error('Testing error')
    })

    const postId = selectedPost.id as string
    const commentId = selectedLike.id as string

    try {
      await getPostLikeByOwnerId(postId, commentId)
    } catch (error) {
      expect(error).toStrictEqual(new GettingPostLikeError(`Error retereaving post comment. ${error.message}`))
    }

    jest.spyOn(postDataSource, 'getPostLikeByOwnerId').mockRestore()

    done()
  })
})
