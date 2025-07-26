# Nhost Next.js Boilerplate Template

A modern, full-stack boilerplate template built with **Next.js** and **Nhost.io**. This template provides authentication, GraphQL API, and real-time features out of the box.

## ✨ Features

- 🔐 **Authentication**: Email/password signup and login with Nhost
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- 🔄 **Auth State Management**: Persistent authentication across pages
- 📊 **GraphQL Integration**: Ready-to-use GraphQL queries and mutations
- 🌙 **Dark Mode**: Built-in dark/light mode support
- 📱 **Responsive**: Mobile-first responsive design
- ⚡ **TypeScript**: Full TypeScript support

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd nhost-next-template/nhost-next
npm install
```

### 2. Set up Nhost Project

1. Create a new project at [Nhost Dashboard](https://app.nhost.io)
2. Copy your project's subdomain and region
3. Create a `.env.local` file:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Nhost credentials:

```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=your-region
```

### 3. Set up Database (Optional)

To see the movies example data, run this SQL in your Nhost SQL Editor:

```sql
CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  director VARCHAR(255),
  release_year INTEGER,
  genre VARCHAR(100),
  rating FLOAT
);

INSERT INTO movies (title, director, release_year, genre, rating) VALUES
  ('Inception', 'Christopher Nolan', 2010, 'Sci-Fi', 8.8),
  ('The Godfather', 'Francis Ford Coppola', 1972, 'Crime', 9.2),
  ('Forrest Gump', 'Robert Zemeckis', 1994, 'Drama', 8.8),
  ('The Matrix', 'Lana Wachowski, Lilly Wachowski', 1999, 'Action', 8.7);
```

Make sure to enable "Track this" and set proper permissions for the `public` role.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/
│   │   └── page.tsx          # Authentication page (signup/login)
│   ├── dashboard/
│   │   └── page.tsx          # Protected dashboard page
│   ├── components/
│   │   └── AuthWrapper.tsx   # Auth state management wrapper
│   ├── layout.tsx            # Root layout with NhostProvider
│   └── page.tsx              # Landing page
├── lib/
│   └── nhost.ts              # Nhost client configuration
└── ...
```

## 🔐 Authentication Flow

1. **Landing Page** (`/`): Shows different content based on auth state
2. **Auth Page** (`/auth`): Handles both signup and login
3. **Chat** (`/chat`): Protected page showing user info and data
4. **Auth Wrapper**: Automatically redirects users based on authentication status

## 🛠️ Key Components

### AuthWrapper
Handles automatic redirects and loading states:
- Redirects unauthenticated users to `/auth`
- Redirects authenticated users away from `/auth`
- Shows loading spinner during auth checks

### Nhost Integration
- **Client**: Configured in `src/lib/nhost.ts`
- **Provider**: Wraps the entire app in `layout.tsx`
- **Hooks**: Uses Nhost React hooks for auth and data fetching

## 🎨 Styling

This template uses **Tailwind CSS** with:
- Responsive design patterns
- Dark mode support
- Modern gradient backgrounds
- Consistent component styling
- Accessible form elements

## 📊 GraphQL Usage

Example query in the dashboard:

```typescript
const getMovies = `
  query {
    movies {
      id
      title
      director
      release_year
      genre
      rating
    }
  }
`

const { data, error } = await nhost.graphql.request(getMovies)
```

## 🚀 Deployment

This template can be deployed to any platform that supports Next.js:

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
- Netlify
- Railway
- Render
- AWS Amplify

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|---------|
| `NEXT_PUBLIC_NHOST_SUBDOMAIN` | Your Nhost project subdomain | Yes |
| `NEXT_PUBLIC_NHOST_REGION` | Your Nhost project region | Yes |

## 📚 Learn More

- [Nhost Documentation](https://docs.nhost.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
