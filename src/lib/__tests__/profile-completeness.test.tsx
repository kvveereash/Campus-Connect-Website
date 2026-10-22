import { render, screen, fireEvent } from '@testing-library/react';
import ProfileCompleteness from '@/components/profile/ProfileCompleteness';
import type { User } from '@/types';

const base = {
    id: 'u1',
    name: 'Asha',
    email: 'asha@x.in',
    collegeId: '',
    department: '',
    year: '',
} as unknown as User;

describe('ProfileCompleteness', () => {
    it('asks for the college first, with the share done so far', () => {
        render(<ProfileCompleteness user={base} onEdit={() => {}} />);
        expect(screen.getByText('Your profile is 0% done')).toBeTruthy();
        expect(screen.getByText(/Add your college/)).toBeTruthy();
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    });

    it('moves on to the next missing piece and opens the editor', () => {
        const onEdit = jest.fn();
        render(<ProfileCompleteness user={{ ...base, collegeId: 'c1', skills: ['React'] }} onEdit={onEdit} />);
        expect(screen.getByText('Your profile is 33% done')).toBeTruthy();
        expect(screen.getByText(/what you are into/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
        expect(onEdit).toHaveBeenCalled();
    });

    it('is gone once everything is filled in', () => {
        const full = {
            ...base,
            collegeId: 'c1',
            skills: ['React'],
            interests: ['Music'],
            avatar: '/a.png',
            bio: 'Hi',
            department: 'CSE',
            year: '2nd',
        };
        const { container } = render(<ProfileCompleteness user={full} onEdit={() => {}} />);
        expect(container.innerHTML).toBe('');
    });
});
