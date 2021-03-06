import { lorem } from 'faker'
import { mongodb } from '../../../../infrastructure/orm'
import { testingLikedAndCommentedPersistedDtoPosts, testingLikedAndCommentedPersistedDomainModelPosts, testingDomainModelFreeUsers } from '../../../../test/fixtures'

import { createPostComment } from '../../'
import { PostDomainModel } from '../../../models'
import { CreatingPostCommentError } from '../../../errors'
import { postDataSource } from '../../../../infrastructure/dataSources'

describe('[SERVICES] Post - createPostComment', () => {
  const { connect, disconnect, models: { Post } } = mongodb

  const mockedPosts = testingLikedAndCommentedPersistedDomainModelPosts as PostDomainModel[]
  const originalPost = mockedPosts[0]
  const newPostCommentOwner = testingDomainModelFreeUsers[0]

  beforeAll(async () => {
    await connect()
    await Post.insertMany(testingLikedAndCommentedPersistedDtoPosts)
  })

  afterAll(async () => {
    await Post.deleteMany({})
    await disconnect()
  })

  it('must persist the new comment into the selected post', async (done) => {
    const { id: postId } = originalPost
    const newPostComment = lorem.paragraph()

    const updatedPost = await createPostComment(postId as string, newPostComment, newPostCommentOwner) as PostDomainModel

    const expectedPostFields = ['id', 'body', 'owner', 'comments', 'likes', 'createdAt', 'updatedAt']
    const updatedPostFields = Object.keys(updatedPost).sort()
    expect(updatedPostFields.sort()).toEqual(expectedPostFields.sort())

    expect(updatedPost.id).toBe(originalPost.id)
    expect(updatedPost.body).toBe(originalPost.body)

    const expectedPostOwnerFields = ['id', 'name', 'surname', 'avatar']
    const createPostCommentdOwnerPostFields = Object.keys(updatedPost.owner).sort()
    expect(createPostCommentdOwnerPostFields.sort()).toEqual(expectedPostOwnerFields.sort())
    expect(updatedPost.owner).toStrictEqual(originalPost.owner)

    expect(updatedPost.comments).toHaveLength(originalPost.comments.length + 1)
    const originalCommentsIds = originalPost.comments.map(({ id }) => id as string)
    const updatedCommentsIds = updatedPost.comments.map(({ id }) => id as string)
    const newPostId = updatedCommentsIds.find((updatedId) => !originalCommentsIds.includes(updatedId))
    const newPersistedComment = updatedPost.comments.find((comment) => comment.id === newPostId) as PostDomainModel
    expect(newPersistedComment.body).toBe(newPostComment)
    expect(newPersistedComment.owner).toStrictEqual(newPostCommentOwner)

    expect(updatedPost.likes).toStrictEqual(originalPost.likes)

    expect(updatedPost.createdAt).toBe(originalPost.createdAt)
    expect(updatedPost.updatedAt).not.toBe(originalPost.updatedAt)

    done()
  })

  it('must throw an INTERNAL_SERVER_ERROR (500) when the persistance process returns a NULL value', async (done) => {
    jest.spyOn(postDataSource, 'createPostComment').mockImplementation(() => Promise.resolve(null))

    const { id: postId } = originalPost
    const newPostComment = lorem.paragraph()

    try {
      await createPostComment(postId as string, newPostComment, newPostCommentOwner)
    } catch (error) {
      const message = 'Post comment insertion process initiated but completed with NULL result'
      expect(error).toStrictEqual(new CreatingPostCommentError(`Error creating post '${postId}' commment by user '${newPostCommentOwner.id}'. ${message}`))
    }

    jest.spyOn(postDataSource, 'createPostComment').mockRestore()

    done()
  })

  it('must throw an INTERNAL_SERVER_ERROR (500) when the persistance throws an exception', async (done) => {
    jest.spyOn(postDataSource, 'createPostComment').mockImplementation(() => {
      throw new Error('Testing error')
    })

    const { id: postId } = originalPost
    const newPostComment = lorem.paragraph()

    try {
      await createPostComment(postId as string, newPostComment, newPostCommentOwner)
    } catch (error) {
      expect(error).toStrictEqual(new CreatingPostCommentError(`Error creating post '${postId}' commment by user '${newPostCommentOwner.id}'. ${error.message}`))
    }

    jest.spyOn(postDataSource, 'createPostComment').mockRestore()

    done()
  })
})
