import { ApolloServer } from "apollo-server";
import { importSchema } from "graphql-import";
import { GraphQLScalarType } from "graphql";

const typeDefs = importSchema("./schema.graphql");

const users = [
  { githubLogin: "@magcho", name: "magcho" },
  { githubLogin: "@magchoa", name: "magchoa" },
  { githubLogin: "@magchob", name: "magchob" },
];

let _id = 4;
const photos = [
  {
    id: "1",
    name: "magcho",
    description: "aaaa",
    category: "PORTRAT",
    githubUser: "@magcho",
    created: "2021/11/13",
  },
  {
    id: "2",
    name: "magcho",
    description: "aaaa",
    category: "PORTRAT",
    githubUser: "@magcho",
    created: "2021/11/13",
  },
  {
    id: "3",
    name: "magchob",
    description: "aaaa",
    category: "PORTRAT",
    githubUser: "@magchob",
    created: "2021/11/13",
  },
];

const tags = [
  {
    photoId: "1",
    userId: "@magchoa",
  },
  {
    photoId: "2",
    userId: "@magcho",
  },
  {
    photoId: "2",
    userId: "@magchoa",
  },
  {
    photoId: "2",
    userId: "@magchob",
  },
];

const resolvers = {
  Query: {
    totalPhotos: () => photos.length,
    allPhotos: (parent, args) => {
      return photos;
    },
    allUsers: () => users,
  },
  Mutation: {
    postPhoto(parent, args) {
      const newPhoto = {
        id: _id++,
        ...args.input,
        created: new Date(),
      };
      photos.push(newPhoto);
      return newPhoto;
    },
  },
  Photo: {
    url: (parent) => `http://example.com/${parent.id}.jpg`,
    postedBy: (parent) => {
      return users.filter((user) => user.githubLogin === parent.githubUser);
    },
    taggedUsers: (parent) => {
      return tags
        .filter((tag) => tag.photoId === parent.id)
        .map((tag) => tag.userId)
        .map((userid) => users.find((user) => user.githubLogin === userid));
    },
  },
  User: {
    postedPhotos: (parent) => {
      return photos.filter((photo) => photo.githubUser === parent.githubLogin);
    },
    inPhotos: (parent) => {
      return tags
        .filter((tag) => tag.userId === parent.githubLogin)
        .map((tag) => tag.photoId)
        .map((photoId) => photos.find((photo) => photo.id === photoId));
    },
  },
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    description: "A valid date time value",
    parseValue: (value) => new Date(value),
    serialize: (value) => new Date(value).toISOString(),
    parseLiteral: (ast) => ast.value,
  }),
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`GraphQL service running on ${url}`);
});
