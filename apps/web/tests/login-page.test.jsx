import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';

// Stub next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('<LoginPage />', () => {
  test('renders email + password fields and a submit button', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('the email input prefills the demo account', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toHaveValue('demo@fredocloud.test');
  });

  test('user can type into the password field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const pw = screen.getByLabelText(/password/i);
    await user.clear(pw);
    await user.type(pw, 'something');
    expect(pw).toHaveValue('something');
  });
});
