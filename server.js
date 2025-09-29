import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = express();

// Config
const isProd = process.env.NODE_ENV === 'production';
const ACCESS_EXPIRES = '15m';
const REFRESH_DAYS = 30;
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;