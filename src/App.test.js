import { render, screen } from '@testing-library/react';
import App from './App';

test('renders toolkit home', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Toolkit' })).toBeInTheDocument();
});
