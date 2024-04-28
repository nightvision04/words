import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/knex';
import { v4 as uuidv4 } from 'uuid';

interface ApiResponse {
  success: boolean;
  token?: string;
  player?: any;
  message?: string;
  error?: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
    const { name } = req.body;
    const token = uuidv4();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 1); // Set expiry to 24 hours later
   
    try {
      const [player] = await db('Players')
        .insert({
          Name: name,
          LastLogin: new Date(),
          LastModified: new Date(),
          // Set other fields as required
        })
        .onConflict('Name')
        .merge()
        .returning('*');
   
      res.setHeader('Set-Cookie', `token=${token}; Expires=${expiry.toUTCString()}; Path=/`);
      res.status(200).json({ success: true, token, player });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Database error', error });
    }
   }