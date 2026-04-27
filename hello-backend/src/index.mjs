import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const db = new DynamoDBClient({ region: 'eu-central-1' });
const USERS_TABLE = process.env.USERS_TABLE;
const ORDERS_TABLE = process.env.ORDERS_TABLE;

const respond = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

export const handler = async (event) => {
  const { httpMethod, path, pathParameters, body: rawBody } = event;
  const body = rawBody ? JSON.parse(rawBody) : {};
  console.log(`[v2] ${httpMethod} ${path}`);

  if (httpMethod === 'POST' && path === '/users') {
    if (!body.name) return respond(400, { error: 'name is required' });
    const user = { userId: `usr_${uid()}`, name: body.name, email: body.email ?? '', createdAt: new Date().toISOString() };
    await db.send(new PutItemCommand({ TableName: USERS_TABLE, Item: marshall(user) }));
    return respond(201, user);
  }

  if (httpMethod === 'GET' && pathParameters?.id) {
    const { Item } = await db.send(new GetItemCommand({ TableName: USERS_TABLE, Key: marshall({ userId: pathParameters.id }) }));
    if (!Item) return respond(404, { error: 'User not found' });
    return respond(200, unmarshall(Item));
  }

  if (httpMethod === 'GET' && path === '/users') {
    const { Items = [] } = await db.send(new ScanCommand({ TableName: USERS_TABLE }));
    return respond(200, { users: Items.map(unmarshall) });
  }

  if (httpMethod === 'POST' && path === '/orders') {
    if (!body.userId || !body.item) return respond(400, { error: 'userId and item are required' });
    const order = { orderId: `ord_${uid()}`, userId: body.userId, item: body.item, amount: body.amount ?? 0, status: 'pending', createdAt: new Date().toISOString() };
    await db.send(new PutItemCommand({ TableName: ORDERS_TABLE, Item: marshall(order) }));
    return respond(201, order);
  }

  return respond(404, { error: 'Not found' });
};
